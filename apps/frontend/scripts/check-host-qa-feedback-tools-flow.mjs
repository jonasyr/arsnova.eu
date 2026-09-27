#!/usr/bin/env node
/**
 * Slice 4 (#470): real session-bound Q&A / quick-feedback controls.
 * Sequential pairwise locale/preset/theme/viewport sample, including motion preferences.
 * Requires the localized frontend and local PostgreSQL/Redis backend.
 *
 * BASE_URL=http://localhost:4200/de TRPC_URL=http://localhost:3000/trpc \
 *   SMOKE_ARTIFACT_DIR=/tmp/host-qa-feedback-tools \
 *   npm run smoke:host-qa-feedback-tools -w @arsnova/frontend
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { chromium } from 'playwright';
import { configureQaSessionIfNeeded } from '../../../scripts/load/lib/configure-qa-if-needed.mjs';
import { assertNoBlockingA11y } from './axe-a11y.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:4200/de')
  .replace(/\/+$/, '')
  .replace(/\/(de|en|fr|es|it)$/, '');
const TRPC_URL = process.env.TRPC_URL || 'http://localhost:3000/trpc';
const ARTIFACT_DIR =
  process.env.SMOKE_ARTIFACT_DIR || join('tmp', 'host-qa-feedback-tools', randomUUID());
const CASES = [
  { locale: 'de', preset: 'PLAYFUL', width: 320, theme: 'light', moderation: true },
  { locale: 'de', preset: 'SERIOUS', width: 1440, theme: 'dark', moderation: true, detailed: true },
  { locale: 'en', preset: 'SERIOUS', width: 600, theme: 'light', moderation: false },
  { locale: 'fr', preset: 'PLAYFUL', width: 840, theme: 'dark', moderation: true },
  { locale: 'es', preset: 'SERIOUS', width: 320, theme: 'dark', moderation: true },
  {
    locale: 'it',
    preset: 'PLAYFUL',
    width: 1440,
    theme: 'light',
    moderation: false,
    motion: 'no-preference',
  },
];
const QUESTIONS = [
  'Lambda: Wie funktioniert die Gruppenarbeit?',
  'Sigma: Wann gibt es Pause?',
  'Delta: Welche Übung folgt?',
];
const QA_TOGGLE = '[data-testid="qa-tools-toggle"]';
const FEEDBACK_TOGGLE = '[data-testid="feedback-round-settings-trigger"]';
let layoutStates = 0;
let axeStates = 0;

function client(headers = {}) {
  return createTRPCProxyClient({
    links: [httpBatchLink({ url: TRPC_URL, headers: () => headers })],
  });
}

async function eventually(read, predicate, label) {
  const deadline = Date.now() + 20_000;
  do {
    const result = await read();
    if (predicate(result)) return result;
    await new Promise((resolve) => setTimeout(resolve, 300));
  } while (Date.now() < deadline);
  throw new Error(`Timed out: ${label}`);
}

async function expectFocus(page, selector) {
  await page
    .waitForFunction((target) => {
      const element = document.querySelector(target);
      if (element !== document.activeElement || !element?.getClientRects().length) return false;
      const rect = element.getBoundingClientRect();
      if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) {
        return false;
      }
      // Fixed app chrome, footer controls, dialogs and popovers must not obscure
      // the actual focus target, even when it is technically rendered.
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === element || element.contains(hit);
    }, selector)
    .catch(async (error) => {
      const state = await page.evaluate((target) => {
        const element = document.querySelector(target);
        const rect = element?.getBoundingClientRect();
        return {
          active: document.activeElement?.outerHTML.slice(0, 400),
          target: rect?.toJSON(),
          covering:
            rect &&
            document
              .elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
              ?.outerHTML.slice(0, 200),
        };
      }, selector);
      throw new Error(`Focus check failed for ${selector}: ${JSON.stringify(state)}`, {
        cause: error,
      });
    });
}

async function closeSortMenu(page) {
  await page.waitForFunction(() => document.activeElement?.closest('[role="menu"]'));
  await page.keyboard.press('Escape');
  await expectFocus(page, '[data-testid="qa-mobile-more"]');
}

async function disclosure(page, toggle, content, expanded) {
  const trigger = page.locator(toggle);
  if ((await trigger.getAttribute('aria-expanded')) !== String(expanded)) {
    await trigger.focus();
    await trigger.press('Enter');
  }
  await page.locator(content).waitFor({ state: expanded ? 'visible' : 'hidden' });
  assert.equal(await trigger.getAttribute('aria-expanded'), String(expanded));
  assert.equal(await page.locator(content).count(), 1, 'Disclosure content must stay mounted.');
  assert.equal(await page.locator(content).isVisible(), expanded);
}

async function collapseFromFocusedChild(page, toggle, content, child) {
  await child.focus();
  // Exercise the component's focus guard before [hidden] takes effect, without
  // first moving focus to the disclosure button as a mouse click would do.
  await page.locator(toggle).evaluate((button) => button.click());
  await expectFocus(page, toggle);
  await page.locator(content).waitFor({ state: 'hidden' });
  assert.equal(await page.locator(content).isVisible(), false);
}

async function checkLayout(page, label, axe = false) {
  await page.evaluate(() => document.fonts.ready);
  // Scan the settled state, not Material's disabled-to-enabled render/transition.
  await page.waitForFunction(
    () => !document.querySelector('.session-host__channel-nav[aria-busy="true"]'),
  );
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const problems = await page.evaluate(() => {
    const problems = [];
    const tolerance = 2;
    if (
      Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) >
      innerWidth + tolerance
    ) {
      problems.push('horizontal document overflow');
    }
    const controls = [
      ...document.querySelectorAll(
        '.session-host__channel-panel--qa button, app-feedback-host button, ' +
          '[data-testid="feedback-primary-round-control"]',
      ),
    ].filter((element) => element.getClientRects().length > 0);
    for (const button of controls) {
      const bounds = button.getBoundingClientRect();
      const name =
        button.getAttribute('aria-label') || button.textContent.trim().replace(/\s+/g, ' ');
      if (bounds.left < -tolerance || bounds.right > innerWidth + tolerance)
        problems.push(`outside viewport: ${name}`);
      if (bounds.width < 24 || bounds.height < 24) problems.push(`small target: ${name}`);
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (
          !node.textContent.trim() ||
          node.parentElement.closest('mat-icon, svg, .cdk-visually-hidden')
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (
            rect.width &&
            rect.height &&
            (rect.left < bounds.left - tolerance ||
              rect.right > bounds.right + tolerance ||
              rect.top < bounds.top - tolerance ||
              rect.bottom > bounds.bottom + tolerance)
          ) {
            problems.push(`clipped label: ${name}`);
          }
        }
      }
    }
    return problems;
  });
  assert.deepEqual(problems, [], label);
  layoutStates += 1;
  if (axe) {
    await assertNoBlockingA11y(page, label, { artifactDir: ARTIFACT_DIR });
    await page.screenshot({ path: join(ARTIFACT_DIR, `${label}.png`), fullPage: true });
    axeStates += 1;
  }
}

async function dismissJoinOverlay(page) {
  const close = page.locator('.session-host__join-viewport-overlay__close');
  if (
    await close.waitFor({ state: 'visible', timeout: 3000 }).then(
      () => true,
      () => false,
    )
  ) {
    await page.locator('.session-host__join-menu-qr').waitFor({ state: 'visible' });
    await close.click();
    await close.waitFor({ state: 'hidden' });
  }
}

async function cards(page, count) {
  const banner = page.locator('.session-qa-new-banner');
  await eventually(
    async () => {
      if (await banner.isVisible()) await banner.click();
      return page.locator('.session-qa-card').count();
    },
    (actual) => actual === count,
    `${count} visible Q&A cards`,
  );
}

async function checkSort(page, value, select = true) {
  const mobile = page.getByTestId('qa-mobile-more');
  if (await mobile.isVisible()) {
    await mobile.click();
    const option = page.getByTestId(`qa-mobile-sort-${value.toLowerCase()}`);
    if (select) {
      await option.click();
      await expectFocus(page, '[data-testid="qa-mobile-more"]');
      await mobile.click();
    }
    await eventually(
      () => option.getAttribute('aria-checked'),
      (checked) => checked === 'true',
      `${value} mobile sort`,
    );
    await closeSortMenu(page);
  } else {
    const option = page.locator(
      `.session-qa-sort-toggle mat-button-toggle[value="${value}"] button`,
    );
    if (select) await option.click();
    await eventually(
      () => option.getAttribute('aria-checked'),
      (checked) => checked === 'true',
      `${value} desktop sort`,
    );
  }
}

async function clearCollapsedFilter(page, testId) {
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', false);
  const clear = page.getByTestId(testId);
  await clear.waitFor({ state: 'visible' });
  await clear.focus();
  await clear.press('Enter');
  await clear.waitFor({ state: 'hidden' });
  await expectFocus(page, QA_TOGGLE);
}

async function checkQa(page, session, hostApi, publicApi, sample, name) {
  await dismissJoinOverlay(page);
  await page.getByTestId('qa-tools-toggle').waitFor();
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', false);
  assert(await page.locator('.session-host__qa-deadline').isVisible());
  assert(await page.locator('[aria-controls="session-host-join-info"]').isVisible());
  await page.locator('.session-qa-empty').waitFor();
  assert.equal(await page.getByTestId('qa-review-pending').count(), sample.moderation ? 1 : 0);
  await checkLayout(page, `${name}-qa-empty`, true);

  const participant = await publicApi.session.join.mutate({
    code: session.code,
    nickname: 'WerkzeugTester',
    anonymousClientId: crypto.randomUUID(),
    joinIdempotencyKey: crypto.randomUUID(),
  });
  const participantApi = client({ 'x-participant-capability': participant.rejoinToken });
  for (const text of QUESTIONS) {
    await participantApi.qa.submit.mutate({
      sessionId: participant.id,
      participantId: participant.participantId,
      text,
      idempotencyKey: crypto.randomUUID(),
    });
  }
  await cards(page, 3);
  if (sample.moderation) {
    assert.match(await page.getByTestId('qa-review-pending').innerText(), /3/);
    await page.screenshot({ path: join(ARTIFACT_DIR, `${name}-qa-pending.png`), fullPage: true });
    await page.getByTestId('qa-review-pending').click();
    await cards(page, 3);
    for (const text of QUESTIONS.slice(0, 2)) {
      await page
        .locator('.session-qa-card', { hasText: text })
        .locator('.session-qa-card__action-btn--approve')
        .click();
    }
    await cards(page, 1);
    assert.match(await page.getByTestId('qa-review-pending').innerText(), /1/);
    await clearCollapsedFilter(page, 'qa-clear-pending');
    await cards(page, 3);
  }
  const first = page.locator('.session-qa-card', { hasText: QUESTIONS[0] });
  await first.locator('.session-qa-card__action-btn--pin').click();
  await first.locator('.session-qa-card__action-btn--unpin').waitFor();
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', true);
  // BEST is the established default before the first user sorting action.
  if (await page.getByTestId('qa-mobile-more').isVisible()) {
    await page.getByTestId('qa-mobile-more').click();
    assert.equal(
      await page.getByTestId('qa-mobile-sort-best').getAttribute('aria-checked'),
      'true',
    );
    await closeSortMenu(page);
  } else {
    assert.equal(
      await page
        .locator('.session-qa-sort-toggle mat-button-toggle[value="BEST"] button')
        .getAttribute('aria-checked'),
      'true',
    );
  }
  for (const sort of ['TOP', 'BEST', 'CONTROVERSIAL', 'TIME']) await checkSort(page, sort);
  const search = page.locator('.session-qa-search input');
  await search.fill('Lambda');
  await cards(page, 1);
  await collapseFromFocusedChild(page, QA_TOGGLE, '#qa-tools-content', search);
  assert.match(await page.getByTestId('qa-clear-search').innerText(), /Lambda/);
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', true);
  assert.equal(await search.inputValue(), 'Lambda');
  await checkSort(page, 'TIME', false);
  await clearCollapsedFilter(page, 'qa-clear-search');
  await cards(page, 3);
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', true);
  await page.getByTestId('qa-filter-pinned').click();
  await cards(page, 1);
  await clearCollapsedFilter(page, 'qa-clear-pinned');
  await cards(page, 3);
  if (sample.moderation) {
    await disclosure(page, QA_TOGGLE, '#qa-tools-content', true);
    await page.getByTestId('qa-filter-pending').click();
    await cards(page, 1);
    await clearCollapsedFilter(page, 'qa-clear-pending');
  }
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', true);
  await page.getByTestId('qa-directory-toggle').click();
  const author = page.locator('.session-participant-directory__identity', {
    hasText: 'WerkzeugTester',
  });
  await author.click();
  await page.getByTestId('qa-clear-author').waitFor();
  await clearCollapsedFilter(page, 'qa-clear-author');
  await checkLayout(page, `${name}-qa-questions`);
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', true);
  await checkLayout(page, `${name}-qa-tools`, sample.detailed);
  await page.getByTestId('qa-word-cloud').click();
  const cloudClose = page.locator('.qa-word-cloud-dialog__close');
  await cloudClose.waitFor();
  await cloudClose.click();
  await cloudClose.waitFor({ state: 'hidden' });
  await expectFocus(page, '[data-testid="qa-word-cloud"]');
  if (await page.getByTestId('qa-mobile-more').isVisible())
    await page.getByTestId('qa-mobile-more').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('qa-questions-export').click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /\.csv$/i);
  assert.match(await readFile(await download.path(), 'utf8'), /Lambda/);
  await disclosure(page, QA_TOGGLE, '#qa-tools-content', false);
  const compass = page.getByTestId('host-moderation-compass');
  assert(await compass.isVisible());
  assert.equal(
    await compass.evaluate((button) => Boolean(button.closest('#qa-tools-content'))),
    false,
  );
  await compass.click();
  await page.locator('mat-dialog-container').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('mat-dialog-container').waitFor({ state: 'hidden' });
  await expectFocus(page, '[data-testid="host-moderation-compass"]');
  if (sample.detailed) {
    await page.locator('.session-host__qa-deadline button').click();
    const dialog = page.locator('app-qa-channel-configuration-dialog');
    await dialog.waitFor();
    const profile = dialog.locator('fieldset').filter({ hasText: 'Teilnahmeprofil' });
    assert.equal(await profile.evaluate((fieldset) => fieldset.disabled), true);
    assert(await dialog.locator('.qa-config__zone').isVisible());
    await dialog.locator('.qa-config__actions button').first().click();
    await dialog.waitFor({ state: 'hidden' });
  }
  return { participant, participantApi };
}

async function feedbackResult(hostApi, code, predicate, label) {
  return eventually(
    () => hostApi.quickFeedback.hostResults.query({ sessionCode: code }),
    predicate,
    label,
  );
}

async function roundReady(page) {
  await page.waitForFunction(() => {
    const status = document.querySelector('app-feedback-host .feedback-host__action-status');
    const primary = document.querySelector('[data-testid="feedback-primary-round-control"]');
    return (
      status && !status.textContent.trim() && primary?.getAttribute('aria-disabled') !== 'true'
    );
  });
}

async function checkFeedback(page, session, hostApi, publicApi, participant, sample, name) {
  await page.getByTestId('add-channel-trigger').click();
  await page.getByTestId('add-channel-quickFeedback').click();
  await page.getByTestId('feedback-empty-tempo').waitFor();
  await page.locator('.session-host__channel-nav[aria-busy="false"]').waitFor();
  assert(await page.getByTestId('feedback-empty-formats').isVisible());
  await checkLayout(page, `${name}-feedback-empty`, sample.detailed);
  await page.getByTestId('feedback-empty-tempo').click();
  await page.locator(FEEDBACK_TOGGLE).waitFor();
  await feedbackResult(hostApi, session.code, (data) => data.type === 'TEMPO', 'tempo start');
  await disclosure(page, FEEDBACK_TOGGLE, '#feedback-round-settings', false);
  await page.getByTestId('feedback-primary-round-control').waitFor();
  await publicApi.quickFeedback.vote.mutate({
    sessionCode: session.code,
    voterId: participant.participantId,
    value: 'SLOW_DOWN',
  });
  await feedbackResult(
    hostApi,
    session.code,
    (data) => data.distribution.SLOW_DOWN === 1,
    'tempo vote',
  );
  await checkLayout(page, `${name}-feedback-running`, true);
  await roundReady(page);
  const primary = page.getByTestId('feedback-primary-round-control');
  await primary.click();
  await feedbackResult(hostApi, session.code, (data) => data.locked, 'stop');
  await expectFocus(page, '[data-testid="feedback-primary-round-control"]');
  await assert.rejects(
    publicApi.quickFeedback.vote.mutate({
      sessionCode: session.code,
      voterId: participant.participantId,
      value: 'LOST',
    }),
  );
  await checkLayout(page, `${name}-feedback-stopped`);
  await roundReady(page);
  await primary.click();
  await feedbackResult(hostApi, session.code, (data) => !data.locked, 'resume');
  await disclosure(page, FEEDBACK_TOGGLE, '#feedback-round-settings', true);
  await roundReady(page);
  const live = page.getByTestId('feedback-live-results').getByRole('switch');
  const checked = await live.getAttribute('aria-checked');
  await live.click();
  await feedbackResult(
    hostApi,
    session.code,
    (data) => data.showLiveResults === (checked !== 'true'),
    'live results',
  );
  await collapseFromFocusedChild(page, FEEDBACK_TOGGLE, '#feedback-round-settings', live);
  await disclosure(page, FEEDBACK_TOGGLE, '#feedback-round-settings', true);
  assert.equal(await live.getAttribute('aria-checked'), checked === 'true' ? 'false' : 'true');
  await roundReady(page);
  await page.locator('#feedback-round-settings [data-feedback-type="MOOD"]').click();
  await feedbackResult(hostApi, session.code, (data) => data.type === 'MOOD', 'format switch');
  await publicApi.quickFeedback.vote.mutate({
    sessionCode: session.code,
    voterId: participant.participantId,
    value: 'POSITIVE',
  });
  await feedbackResult(hostApi, session.code, (data) => data.totalVotes === 1, 'mood vote');
  await page.getByTestId('feedback-compare-round').waitFor();
  await roundReady(page);
  await page.locator('#feedback-round-settings [data-feedback-type="STARS"]').click();
  await page.locator('.feedback-compare-round-snackbar').waitFor();
  assert.equal(
    (await hostApi.quickFeedback.hostResults.query({ sessionCode: session.code })).type,
    'MOOD',
  );
  await page.getByTestId('feedback-compare-round').click();
  await feedbackResult(
    hostApi,
    session.code,
    (data) => data.discussion && data.locked,
    'discussion',
  );
  await page.getByTestId('feedback-second-round').waitFor();
  await roundReady(page);
  await page.getByTestId('feedback-second-round').click();
  await feedbackResult(
    hostApi,
    session.code,
    (data) => data.currentRound === 2 && !data.locked,
    'second round',
  );
  await page.getByTestId('feedback-second-round').waitFor({ state: 'hidden' });
  await expectFocus(page, FEEDBACK_TOGGLE);
  await publicApi.quickFeedback.vote.mutate({
    sessionCode: session.code,
    voterId: participant.participantId,
    value: 'NEUTRAL',
  });
  await feedbackResult(
    hostApi,
    session.code,
    (data) => data.currentRound === 2 && data.totalVotes === 1,
    'comparison vote',
  );
  await checkLayout(page, `${name}-feedback-comparison`);
  await roundReady(page);
  if (sample.detailed) {
    await page.route(/\/trpc\/[^?]*quickFeedback\.reset/, (route) => route.abort('failed'), {
      times: 1,
    });
    await page.getByTestId('feedback-reset-round').click();
    await page.locator('app-feedback-host [role="alert"]').waitFor();
    assert.equal(
      (await hostApi.quickFeedback.hostResults.query({ sessionCode: session.code })).totalVotes,
      1,
    );
    assert(await page.getByTestId('feedback-reset-round').isEnabled());
    await checkLayout(page, `${name}-feedback-failed-reset`, true);
  }
  await page.getByTestId('feedback-reset-round').click();
  await feedbackResult(
    hostApi,
    session.code,
    (data) => !data.currentRound && data.totalVotes === 0,
    'reset/retry',
  );
  await eventually(
    () => page.locator('.feedback-host__votes').innerText(),
    (text) => /^0\s/u.test(text.trim()),
    'reset result rendered with zero votes',
  );
  await roundReady(page);
  await page.locator('#feedback-round-settings [data-feedback-type="STARS"]').click();
  await feedbackResult(
    hostApi,
    session.code,
    (data) => data.type === 'STARS',
    'format unlock after reset',
  );
  await checkLayout(page, `${name}-feedback-settings`);
  if (sample.detailed) {
    const beforeDisconnect = await live.getAttribute('aria-checked');
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.locator('.app-offline-banner[role="alert"]').waitFor();
    await hostApi.quickFeedback.setLiveResults.mutate({
      sessionCode: session.code,
      showLiveResults: beforeDisconnect !== 'true',
    });
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.locator('.app-offline-banner[role="alert"]').waitFor({ state: 'hidden' });
    await eventually(
      () => live.getAttribute('aria-checked'),
      (value) => value === String(beforeDisconnect !== 'true'),
      'feedback snapshot after offline/online reconnect',
    );
  }
  const before = await hostApi.session.getInfo.query({ code: session.code });
  assert.equal(
    before.participantCount,
    1,
    'Changing channels/formats must preserve the joined identity.',
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('feedback-primary-round-control').waitFor();
  await dismissJoinOverlay(page);
  await disclosure(page, FEEDBACK_TOGGLE, '#feedback-round-settings', false);
  assert.equal(
    (await hostApi.session.getInfo.query({ code: session.code })).preferredChannel,
    'quickFeedback',
  );
  assert.equal(
    (await hostApi.quickFeedback.hostResults.query({ sessionCode: session.code })).type,
    'STARS',
  );
}

async function checkDeadline(page, session, hostApi, participantApi, participant) {
  const selection = { kind: 'ABSOLUTE', closesAt: new Date(Date.now() + 3_000).toISOString() };
  const preview = await hostApi.session.previewQaConfiguration.query({
    code: session.code,
    mode: 'REPLAN',
    selection,
  });
  await hostApi.session.configureQaChannel.mutate({
    code: session.code,
    mode: 'REPLAN',
    selection,
    expectedLifecycleRevision: preview.expectedLifecycleRevision,
    previewServerNow: preview.serverNow,
    confirmedQaClosesAt: preview.newQaClosesAt,
    confirmedExpiresAt: preview.newExpiresAt,
    confirmSessionExtension: false,
    moderationMode: true,
  });
  await eventually(
    () => hostApi.session.getInfo.query({ code: session.code }),
    (info) => info.channels.qa.state === 'DEADLINE_EXPIRED',
    'Q&A deadline',
  );
  await page.locator('.session-channel-tabs mat-button-toggle').filter({ hasText: 'Q&A' }).click();
  await page.locator('.session-host__qa-deadline--expired').waitFor();
  await assert.rejects(
    participantApi.qa.submit.mutate({
      sessionId: participant.id,
      participantId: participant.participantId,
      text: 'Zu spät',
      idempotencyKey: crypto.randomUUID(),
    }),
  );
  await page
    .locator('.session-qa-card', { hasText: QUESTIONS[0] })
    .locator('.session-qa-card__action-btn--unpin')
    .click();
  await page
    .locator('.session-qa-card', { hasText: QUESTIONS[0] })
    .locator('.session-qa-card__action-btn--pin')
    .waitFor();
  await page.getByTestId('qa-review-pending').click();
  await page
    .locator('.session-qa-card', { hasText: QUESTIONS[2] })
    .locator('.session-qa-card__action-btn--approve')
    .click();
  await cards(page, 0);
  assert.match(await page.getByTestId('qa-review-pending').innerText(), /0/);
  await clearCollapsedFilter(page, 'qa-clear-pending');
  await cards(page, 3);
}

async function runCase(browser, publicApi, sample) {
  const name = `${sample.locale}-${sample.preset.toLowerCase()}-${sample.width}-${sample.theme}`;
  console.log(`Starting ${name}`);
  const session = await publicApi.session.create.mutate({
    type: 'Q_AND_A',
    title: `Slice 4 Tools ${name} ${Date.now()}`,
    qaModerationMode: sample.moderation,
    quickFeedbackEnabled: false,
    allowCustomNicknames: true,
    nicknameTheme: 'HIGH_SCHOOL',
    anonymousMode: false,
    teamMode: false,
  });
  const hostApi = client({ 'x-host-token': session.hostToken });
  let context;
  let page;
  try {
    await configureQaSessionIfNeeded(hostApi, session.code, { moderationMode: sample.moderation });
    await hostApi.session.startQa.mutate({ code: session.code });
    context = await browser.newContext({
      viewport: { width: sample.width, height: 1000 },
      locale: sample.locale,
      colorScheme: sample.theme,
      reducedMotion: sample.motion ?? 'reduce',
      serviceWorkers: 'block',
      acceptDownloads: true,
    });
    await context.addInitScript(
      ({ code, hostToken, sample }) => {
        sessionStorage.setItem(`arsnova-host-token:${code}`, hostToken);
        localStorage.setItem('home-theme', sample.theme);
        localStorage.setItem(
          'home-preset',
          sample.preset === 'PLAYFUL' ? 'spielerisch' : 'serious',
        );
      },
      { code: session.code, hostToken: session.hostToken, sample },
    );
    page = await context.newPage();
    page.setDefaultTimeout(20_000);
    await page.goto(`${BASE_URL}/${sample.locale}/session/${session.code}/host`, {
      waitUntil: 'domcontentloaded',
    });
    await dismissJoinOverlay(page);
    await page.getByTestId('qa-tools-toggle').waitFor();
    const appearance = await page.evaluate(() => ({
      locale: document.documentElement.lang,
      dark: document.documentElement.classList.contains('dark'),
      playful: document.documentElement.classList.contains('preset-playful'),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }));
    assert(appearance.locale.startsWith(sample.locale));
    assert.equal(appearance.dark, sample.theme === 'dark');
    assert.equal(appearance.playful, sample.preset === 'PLAYFUL');
    assert.equal(appearance.reduced, sample.motion !== 'no-preference');
    const { participant, participantApi } = await checkQa(
      page,
      session,
      hostApi,
      publicApi,
      sample,
      name,
    );
    await checkFeedback(page, session, hostApi, publicApi, participant, sample, name);
    if (sample.detailed) {
      await checkDeadline(page, session, hostApi, participantApi, participant);
      await checkLayout(page, `${name}-qa-deadline`, true);
    }
    await page.screenshot({ path: join(ARTIFACT_DIR, `${name}-completed.png`), fullPage: true });
    console.log(
      `OK ${name}: Q&A tools, filters, moderation, CSV/cloud/compass; feedback states, comparison, locks, reset, reload`,
    );
  } catch (error) {
    await page
      ?.screenshot({ path: join(ARTIFACT_DIR, `${name}-failure.png`), fullPage: true })
      .catch(() => undefined);
    throw error;
  } finally {
    try {
      await hostApi.session.end.mutate({ code: session.code });
    } finally {
      await context?.close();
    }
  }
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const publicApi = client();
    for (const sample of CASES) await runCase(browser, publicApi, sample);
    console.log(
      `Host Q&A/feedback tools smoke passed: ${CASES.length} sequential cases, ${layoutStates} layout states, ${axeStates} axe states. Artifacts: ${ARTIFACT_DIR}`,
    );
  } finally {
    await browser.close();
  }
}

await main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
