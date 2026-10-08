#!/usr/bin/env node
/**
 * Epic #405 — Host-Nutzerszenario (mehrtägige Q&A-Session).
 *
 * Prüft:
 * - Q&A-Start zeigt die Host-Zugangskarte
 * - Zugang für Teilnehmende sitzt in der Q&A-Action-Bar
 * - Self-Service-Wiederherstellung mit Session-Kennung und Recovery-Code
 *
 * Run:
 *   BASE_URL=http://localhost:4200/de TRPC_URL=http://localhost:3000/trpc \
 *     npm run smoke:epic-405-host-qa-lifecycle -w @arsnova/frontend
 */
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';
import { configureQaSessionIfNeeded } from '../../../scripts/load/lib/configure-qa-if-needed.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:4200/de').replace(/\/+$/, '');
const TRPC_URL = (process.env.TRPC_URL || 'http://localhost:3000/trpc').replace(/\/+$/, '');
const DESKTOP = { width: 1440, height: 1000 };
const HOST_TOKEN_STORAGE_PREFIX = 'arsnova-host-token:';
const HOST_BROWSER_CAPABILITY_PREFIX = 'arsnova-host-browser-capability';
const HOST_RECOVERY_CARD_PREFIX = 'arsnova-host-recovery-card';

function logStep(ok, label, detail = '') {
  const prefix = ok ? 'OK ' : 'FEHLER ';
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`${prefix}${label}${suffix}`);
}

function createTrpcClient(hostToken) {
  return createTRPCProxyClient({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        headers: hostToken ? () => ({ 'x-host-token': hostToken }) : undefined,
        fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15_000) }),
      }),
    ],
  });
}

function attachHostPageGuards(page) {
  page.on('dialog', (dialog) => {
    void dialog.accept().catch(() => undefined);
  });
}

async function closeHostContext(page, context) {
  await page
    .evaluate(() => {
      globalThis.onbeforeunload = null;
    })
    .catch(() => undefined);
  await page.close({ runBeforeUnload: false }).catch(() => undefined);
  await Promise.race([
    context.close(),
    new Promise((resolve) => {
      setTimeout(resolve, 5_000);
    }),
  ]);
}

async function waitForServer(url, maxAttempts = 30) {
  for (let index = 0; index < maxAttempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // App noch nicht bereit.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return webkit.launch({ headless: true });
  }
}

async function waitForPathSuffix(page, suffix, timeout = 30_000) {
  await page.waitForFunction(
    (expectedSuffix) => globalThis.location.pathname.endsWith(expectedSuffix),
    suffix,
    { timeout },
  );
}

async function createConfiguredQaSession() {
  const publicTrpc = createTrpcClient();
  const created = await publicTrpc.session.create.mutate({
    type: 'Q_AND_A',
    title: `Epic 405 Host Smoke ${Date.now()}`,
    moderationMode: false,
    qaModerationMode: false,
    quickFeedbackEnabled: false,
    allowCustomNicknames: true,
    nicknameTheme: 'HIGH_SCHOOL',
    anonymousMode: false,
    teamMode: false,
  });
  if (!created.hostBrowserCapability || !created.hostRecoveryCard?.supportId) {
    throw new Error('session.create lieferte keine Host-Zugangskarte.');
  }
  const hostTrpc = createTrpcClient(created.hostToken);
  await configureQaSessionIfNeeded(hostTrpc, created.code, {
    qaTitle: 'Epic 405 Host-Smoke',
  });
  return created;
}

async function seedHostBrowser(context, session, options = {}) {
  const stageRecoveryCard = options.stageRecoveryCard !== false;
  await context.addInitScript(
    ({ browserCapability, card, code, hostToken, prefixes, stageRecoveryCard: stageCard }) => {
      const marker = `arsnova-smoke-host-seeded:${code}`;
      globalThis.sessionStorage.setItem(`${prefixes.token}${code}`, hostToken);
      globalThis.localStorage.setItem(`${prefixes.capability}-${code}`, browserCapability);
      if (stageCard && !globalThis.sessionStorage.getItem(marker)) {
        globalThis.sessionStorage.setItem(`${prefixes.card}-${code}`, JSON.stringify(card));
        globalThis.localStorage.setItem(
          'arsnova-host-scenario:v1',
          JSON.stringify({ version: 1, scenario: 'CLASSROOM' }),
        );
        globalThis.sessionStorage.setItem(marker, '1');
      }
    },
    {
      browserCapability: session.hostBrowserCapability,
      card: session.hostRecoveryCard,
      code: session.code,
      hostToken: session.hostToken,
      prefixes: {
        token: HOST_TOKEN_STORAGE_PREFIX,
        capability: HOST_BROWSER_CAPABILITY_PREFIX,
        card: HOST_RECOVERY_CARD_PREFIX,
      },
      stageRecoveryCard,
    },
  );
}

async function hostPageDiagnostics(page) {
  return page.evaluate(() => {
    const testIds = [...document.querySelectorAll('[data-testid]')]
      .map((el) => el.getAttribute('data-testid'))
      .filter(Boolean)
      .slice(0, 40);
    return {
      url: globalThis.location.href,
      title: document.title,
      testIds,
      body: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800),
    };
  });
}

async function captureHostFailure(page, label) {
  const diagnostics = await hostPageDiagnostics(page).catch(() => null);
  const dir = process.env.SMOKE_ARTIFACT_DIR;
  if (dir) {
    await mkdir(dir, { recursive: true });
    await page
      .screenshot({ path: join(dir, `${label}.png`), fullPage: true })
      .catch(() => undefined);
  }
  return diagnostics;
}

async function waitForRecoveryUiGone(page) {
  await page
    .locator('[data-testid="host-recovery-card-done"]')
    .waitFor({ state: 'hidden', timeout: 10_000 })
    .catch(() => undefined);
  await page
    .locator('.host-recovery-card-dialog-backdrop')
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => undefined);
}

async function dismissRecoveryCard(page) {
  const done = page.locator('[data-testid="host-recovery-card-done"]');
  const dialog = page.locator('app-host-recovery-card-dialog');
  await done.waitFor({ state: 'visible', timeout: 30_000 });
  const supportVisible = await page.getByText(sessionSupportIdPattern()).first().isVisible();
  await dialog.getByRole('checkbox').check();
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-testid="host-recovery-card-done"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await done.click({ timeout: 10_000 });
  await waitForRecoveryUiGone(page);
  return supportVisible;
}

function sessionSupportIdPattern() {
  return /ARS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}/;
}

async function dismissJoinOverlay(page, timeout = 8_000) {
  const overlay = page.locator('.session-host__join-viewport-overlay').first();
  const appeared = await overlay
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return;
  await page.locator('.session-host__join-viewport-overlay__close').click();
  await overlay.waitFor({ state: 'hidden', timeout: 5_000 });
}

async function openHostSession(page, code) {
  await page.goto(`${BASE_URL}/session/${code}/host`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await waitForPathSuffix(page, `/session/${code}/host`);
}

async function prepareHostSurface(page) {
  try {
    await page
      .locator(
        [
          '[data-testid="add-channel-trigger"]',
          '[data-testid="host-recovery-card-done"]',
          '[data-testid="host-access-revoked"]',
          '.session-channel-tabs',
          '.session-host',
        ].join(', '),
      )
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    const diagnostics = await captureHostFailure(page, 'epic-405-host-surface');
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}${
        diagnostics ? `\nHost-DOM: ${JSON.stringify(diagnostics)}` : ''
      }`,
      { cause: error },
    );
  }
  if (
    await page
      .getByTestId('host-access-revoked')
      .isVisible()
      .catch(() => false)
  ) {
    const diagnostics = await captureHostFailure(page, 'epic-405-host-revoked');
    throw new Error(
      `Host-Zugang nach Reload entzogen.${diagnostics ? ` DOM: ${JSON.stringify(diagnostics)}` : ''}`,
    );
  }
  const recoveryDone = page.locator('[data-testid="host-recovery-card-done"]');
  if (await recoveryDone.isVisible().catch(() => false)) {
    await dismissRecoveryCard(page).catch(async () => {
      await page
        .locator('[data-testid="host-recovery-card-cancel"]')
        .click({ timeout: 3_000 })
        .catch(() => undefined);
    });
    await waitForRecoveryUiGone(page);
  }
  await dismissJoinOverlay(page, 3_000);
  await waitForRecoveryUiGone(page);
  await page
    .locator('.host-recovery-card-dialog-backdrop')
    .waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => undefined);
}

function assertClosedLiveChannels(channels) {
  if (!channels?.qa?.enabled || channels.qa.open !== false || !channels.quickFeedback?.enabled) {
    throw new Error(
      `Unerwarteter Kanalstand nach closeQaChannel: ${JSON.stringify(channels ?? null)}`,
    );
  }
}

async function verifySingleQaNavigation(host, code) {
  await dismissJoinOverlay(host, 2_000);
  const trigger = host.getByTestId('add-channel-trigger');
  try {
    await trigger.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (error) {
    const diagnostics = await hostPageDiagnostics(host);
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nHost-DOM: ${JSON.stringify(diagnostics)}`,
      { cause: error },
    );
  }
  assert.equal(await host.locator('.session-channel-tabs').count(), 0);
  assert.equal(
    await host.evaluate(
      (sessionCode) => sessionStorage.getItem(`arsnova-host-scenario-session:v1:${sessionCode}`),
      code,
    ),
    null,
  );
  await trigger.focus();
  await trigger.press('Enter');
  await host.getByTestId('add-channel-quiz').waitFor({ state: 'visible' });
  assert(await host.getByTestId('add-channel-quickFeedback').isVisible());
  assert.equal(await host.getByTestId('add-channel-qa').count(), 0);
  assert.equal(await host.getByRole('menuitem').count(), 2);
  await host.keyboard.press('Escape');
  await host.waitForFunction(
    () => document.activeElement?.getAttribute('data-testid') === 'add-channel-trigger',
  );
  logStep(true, 'Bestehendes Q&A bleibt ohne Aufgaben-Zuordnung und ohne Tab-Leiste');
}

async function verifyClosedQaNavigation(host) {
  await prepareHostSurface(host);
  try {
    await host.locator('.session-channel-tabs mat-button-toggle').nth(1).waitFor({
      state: 'attached',
      timeout: 30_000,
    });
    await host
      .locator('.session-channel-tabs mat-button-toggle')
      .first()
      .locator('.session-channel-tabs__badge')
      .waitFor({ state: 'visible', timeout: 15_000 });
  } catch (error) {
    const diagnostics = await hostPageDiagnostics(host);
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nHost-DOM: ${JSON.stringify(diagnostics)}`,
      { cause: error },
    );
  }
  const qaTab = host.locator('.session-channel-tabs mat-button-toggle').first();
  assert.equal((await qaTab.locator('.session-channel-tabs__label').innerText()).trim(), 'Q&A');
  assert.match(await qaTab.locator('.session-channel-tabs__badge').innerText(), /^(Zu|Closed)$/i);
  await host.getByTestId('add-channel-trigger').click();
  await host.getByTestId('add-channel-quiz').waitFor({ state: 'visible' });
  assert.equal(await host.getByRole('menuitem').count(), 1);
  assert.equal(await host.getByTestId('add-channel-qa').count(), 0);
  assert.equal(await host.getByTestId('add-channel-quickFeedback').count(), 0);
  await host.keyboard.press('Escape');
}

async function main() {
  if (!(await waitForServer(BASE_URL))) {
    throw new Error(`Frontend nicht erreichbar unter ${BASE_URL}.`);
  }
  if (!(await waitForServer(`${TRPC_URL}/health.check`))) {
    throw new Error(`Backend nicht erreichbar unter ${TRPC_URL}.`);
  }

  const session = await createConfiguredQaSession();
  const browser = await launchBrowser();
  const failures = [];

  try {
    const hostContext = await browser.newContext({ viewport: DESKTOP });
    await seedHostBrowser(hostContext, session);
    const host = await hostContext.newPage();
    attachHostPageGuards(host);
    await openHostSession(host, session.code);
    await host
      .locator('.session-host, [data-testid="host-recovery-card-done"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });

    const cardOk = await dismissRecoveryCard(host).catch(async (error) => {
      const diagnostics = await hostPageDiagnostics(host).catch(() => null);
      failures.push(
        `Host-Zugangskarte: ${error instanceof Error ? error.message : String(error)}${
          diagnostics ? ` DOM: ${JSON.stringify(diagnostics)}` : ''
        }`,
      );
      return false;
    });
    logStep(cardOk, 'Host sichert die Zugangskarte nach Q&A-Start');
    if (!cardOk) {
      if (failures.length === 0) {
        failures.push('Zugangskarte zeigte keine Session-Kennung.');
      }
      await host
        .locator('[data-testid="host-recovery-card-cancel"]')
        .click({ timeout: 3_000 })
        .catch(() => undefined);
    }

    await dismissJoinOverlay(host).catch((error) => {
      failures.push(`Beitritts-Overlay: ${error instanceof Error ? error.message : String(error)}`);
    });
    await waitForRecoveryUiGone(host);
    await verifySingleQaNavigation(host, session.code);

    const qaSettings = host.getByRole('button', { name: /Q&A-Einstellungen/i });
    const settingsOk = await qaSettings.isVisible().catch(() => false);
    logStep(settingsOk, 'Q&A-Kanal zeigt Q&A-Einstellungen');
    if (!settingsOk) {
      failures.push('Q&A ohne »Q&A-Einstellungen«.');
    }

    if (settingsOk) {
      try {
        await qaSettings.click();
        const dialog = host.locator('mat-dialog-container').filter({ hasText: /Fragerunde/i });
        await dialog.waitFor({ state: 'visible', timeout: 10_000 });
        await host.getByRole('button', { name: /Abbrechen/i }).click();
        await dialog.waitFor({ state: 'hidden', timeout: 10_000 });
        logStep(true, 'Host öffnet die Q&A-Einstellungen');
      } catch (error) {
        failures.push(
          `Q&A-Einstellungen-Dialog: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await waitForRecoveryUiGone(host);
    await host.getByTestId('add-channel-trigger').click();
    await host.getByTestId('add-channel-quickFeedback').click();
    await host.locator('.session-channel-tabs mat-button-toggle').nth(1).waitFor({
      state: 'attached',
      timeout: 20_000,
    });
    logStep(true, 'Blitzlicht ist als zweites Format sichtbar');
    const closedChannels = await createTrpcClient(session.hostToken).session.closeQaChannel.mutate({
      code: session.code,
    });
    assertClosedLiveChannels(closedChannels);
    await host
      .locator('.session-channel-tabs mat-button-toggle')
      .first()
      .locator('.session-channel-tabs__badge')
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => undefined);
    await closeHostContext(host, hostContext);

    const persistContext = await browser.newContext({ viewport: DESKTOP });
    await seedHostBrowser(persistContext, session, { stageRecoveryCard: false });
    const persistHost = await persistContext.newPage();
    attachHostPageGuards(persistHost);
    await openHostSession(persistHost, session.code);
    await verifyClosedQaNavigation(persistHost);
    logStep(
      true,
      'Geschlossenes Q&A bleibt nach Reload als »Zu« sichtbar und ist kein hinzufügbares Format',
    );

    await persistContext.close();

    const recoveryContext = await browser.newContext({ viewport: DESKTOP });
    const recovery = await recoveryContext.newPage();
    attachHostPageGuards(recovery);
    await recovery.goto(`${BASE_URL}/host-recovery`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await recovery.getByLabel(/Session-Kennung/i).fill(session.hostRecoveryCard.supportId);
    await recovery
      .getByLabel(/Wiederherstellungscode/i)
      .fill(session.hostRecoveryCard.recoveryCode);
    await recovery.locator('[data-testid="host-recovery-continue"]').click();
    await recovery.locator('[data-testid="host-recovery-activate"]').waitFor({
      state: 'visible',
      timeout: 20_000,
    });
    await recovery.getByRole('checkbox').check();
    await recovery.locator('[data-testid="host-recovery-activate"]').click();
    await recovery.locator('[data-testid="host-recovery-open-session"]').waitFor({
      state: 'visible',
      timeout: 20_000,
    });
    await recovery.locator('[data-testid="host-recovery-open-session"]').click();
    const recovered = await waitForPathSuffix(recovery, `/session/${session.code}/host`, 20_000)
      .then(() => true)
      .catch(() => false);
    const liveCount = recovery.locator('.session-host__live-participants-count').first();
    const liveReady = recovered
      ? await liveCount.waitFor({ state: 'visible', timeout: 15_000 }).then(
          () => true,
          () => false,
        )
      : false;
    logStep(liveReady, 'Host stellt den Zugang über die Zugangskarte wieder her');
    if (!liveReady) {
      const bodyText = (
        (await recovery
          .locator('body')
          .innerText()
          .catch(() => '')) || ''
      ).slice(0, 400);
      failures.push(`Wiederherstellung landete nicht in der Host-Ansicht. DOM: ${bodyText}`);
    } else {
      await dismissRecoveryCard(recovery);
      await dismissJoinOverlay(recovery);
      await verifyClosedQaNavigation(recovery);
      logStep(true, 'Host-Recovery erhält aktivierte Formate und den geschlossenen Q&A-Status');
    }

    await recoveryContext.close();
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error('\nFehlgeschlagene Host-Prüfschritte:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`\n✓ Epic-#405-Host-Q&A-Lifecycle-Smoke bestanden (${session.code}).`);
}

await main().catch((error) => {
  console.error(error);
  process.exit(1);
});
