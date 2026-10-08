#!/usr/bin/env node
/**
 * Issue #456, Slice 8: local acceptance scenario with the canonical demo quiz.
 *
 * Validation (network-free):
 *   node scripts/load/issue-456-demo-acceptance.mjs --validate
 *
 * Local acceptance run (never accepts a production target):
 *   Terminal 1: QA_SUMMARY_ENABLED=true npm run dev:backend
 *   Terminal 2: node scripts/load/issue-456-demo-acceptance.mjs --run
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configureQaSessionIfNeeded } from './lib/configure-qa-if-needed.mjs';
import {
  ISSUE_456_MIN_PARTICIPANTS,
  ISSUE_456_QUESTIONS_PER_PARTICIPANT,
  buildIssue456DemoQaCorpus,
  summarizeIssue456Corpus,
} from './lib/issue-456-demo-qa-corpus.mjs';
import { writeScenarioReport } from './lib/reporting.mjs';
import { createHttpTrpcSingle } from './lib/trpc-runtime.mjs';
import { runDemoQuizClassroom } from './demo-quiz-classroom-30.mjs';

const CANONICAL_DEMO_QUIZ_URL = new URL(
  '../../apps/frontend/src/assets/demo/quiz-demo-showcase.de.json',
  import.meta.url,
);
const CANONICAL_DEMO_QUIZ_PATH = fileURLToPath(CANONICAL_DEMO_QUIZ_URL);
const CANONICAL_DEMO_QUIZ_REPOSITORY_PATH =
  'apps/frontend/src/assets/demo/quiz-demo-showcase.de.json';
const EXPECTED_DEMO_QUESTION_COUNT = 13;
const EXPECTED_DEMO_QUESTION_TYPES = new Set([
  'SURVEY',
  'FREETEXT',
  'NUMERIC_ESTIMATE',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'SHORT_TEXT',
  'ORDERING',
  'MATCHING',
  'CATEGORIZATION',
  'RATING',
]);
const LOCAL_TARGET_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const ISSUE_456_MANUAL_LEARNING_OBJECTIVE =
  'Lernende können die zehn Fragetypen des Demo-Quiz didaktisch begründet einsetzen und Quiz-, Q&A- sowie Blitzlicht-Ergebnisse für die Nachbesprechung nutzen.';

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} muss eine positive Ganzzahl sein.`);
  }
  return parsed;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function summarizeDurations(values) {
  return {
    p50Ms: Math.round(percentile(values, 50)),
    p95Ms: Math.round(percentile(values, 95)),
    maxMs: Math.round(Math.max(0, ...values)),
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export function assertIssue456LocalTrpcTarget(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl));
  } catch {
    throw new Error('TRPC_URL ist keine gültige URL.');
  }
  if (url.protocol !== 'http:') {
    throw new Error('Der Issue-#456-Abnahmetest erlaubt ausschließlich lokales HTTP.');
  }
  if (!LOCAL_TARGET_HOSTS.has(url.hostname)) {
    throw new Error(`Der Issue-#456-Abnahmetest verweigert das nichtlokale Ziel ${url.hostname}.`);
  }
  if (url.username || url.password) {
    throw new Error('TRPC_URL darf keine Zugangsdaten enthalten.');
  }
  if (!/^\/trpc\/?$/.test(url.pathname)) {
    throw new Error('TRPC_URL muss auf den lokalen /trpc-Endpunkt zeigen.');
  }
  return url.toString();
}

export async function validateIssue456DemoAcceptance(options = {}) {
  const participantCount = positiveInteger(
    options.participants ?? ISSUE_456_MIN_PARTICIPANTS,
    'participants',
  );
  const questionsPerParticipant = positiveInteger(
    options.questionsPerParticipant ?? ISSUE_456_QUESTIONS_PER_PARTICIPANT,
    'questionsPerParticipant',
  );
  const raw = JSON.parse(await readFile(CANONICAL_DEMO_QUIZ_URL, 'utf8'));
  const quiz = raw?.quiz;
  if (!quiz || !Array.isArray(quiz.questions)) {
    throw new Error('Das kanonische Demo-Quiz hat kein gültiges Quiz-Objekt.');
  }
  if (quiz.questions.length !== EXPECTED_DEMO_QUESTION_COUNT) {
    throw new Error(
      `Das kanonische Demo-Quiz hat ${quiz.questions.length} statt ${EXPECTED_DEMO_QUESTION_COUNT} Fragen.`,
    );
  }
  const actualTypes = new Set(quiz.questions.map((question) => question.type));
  for (const expectedType of EXPECTED_DEMO_QUESTION_TYPES) {
    if (!actualTypes.has(expectedType)) {
      throw new Error(`Im kanonischen Demo-Quiz fehlt der Fragetyp ${expectedType}.`);
    }
  }

  const corpus = buildIssue456DemoQaCorpus(participantCount, questionsPerParticipant);
  const corpusSummary = summarizeIssue456Corpus(corpus);
  const invalidText = corpus.find((item) => {
    const codePoints = [...item.text.trim()].length;
    return codePoints < 20 || codePoints > 500 || !item.text.trim().endsWith('?');
  });
  if (invalidText) {
    throw new Error(
      `Ungültiger Korpustext für Person ${invalidText.participantIndex + 1}, Frage ${invalidText.questionIndex + 1}.`,
    );
  }
  if (
    corpusSummary.questionsPerParticipant.some(
      (count) => count !== ISSUE_456_QUESTIONS_PER_PARTICIPANT,
    )
  ) {
    throw new Error('Nicht jede Person erhält genau zehn sinnvolle Q&A-Fragen.');
  }
  if (
    corpusSummary.scopes['demo-quiz'] !== corpus.length / 2 ||
    corpusSummary.scopes['arsnova.eu'] !== corpus.length / 2
  ) {
    throw new Error('Der Korpus muss Demo-Quiz und arsnova.eu gleichgewichtet abdecken.');
  }

  return {
    mode: 'network-free-validation',
    canonicalQuiz: {
      path: CANONICAL_DEMO_QUIZ_PATH,
      name: quiz.name,
      questions: quiz.questions.length,
      questionTypes: [...actualTypes].sort(),
    },
    corpus: {
      participants: corpusSummary.participants,
      questionsPerParticipant: ISSUE_456_QUESTIONS_PER_PARTICIPANT,
      questions: corpusSummary.questions,
      uniqueTexts: corpusSummary.uniqueTexts,
      scopes: corpusSummary.scopes,
    },
    networkModel: 'single-local-runner-shared-source-address',
  };
}

export async function saveIssue456ManualLearningObjective(
  hostTrpc,
  code,
  createObjectiveId = () => globalThis.crypto.randomUUID(),
) {
  const initial = await hostTrpc.session.getLearningObjectives.query({ code });
  if (initial.access.state !== 'writable') {
    throw new Error(`Lernziele sind in diesem Zustand nicht schreibbar: ${initial.access.reason}.`);
  }
  if (initial.availableQuizTasks.length !== EXPECTED_DEMO_QUESTION_COUNT) {
    throw new Error(
      `Der Lernzielschritt erwartet ${EXPECTED_DEMO_QUESTION_COUNT} verfügbare Demo-Quiz-Aufgaben.`,
    );
  }
  const objectiveId = createObjectiveId();
  const saved = await hostTrpc.session.saveLearningObjectives.mutate({
    code,
    expectedLearningContextRevision: initial.learningContextRevision,
    mutations: [
      {
        action: 'upsert',
        objectiveId,
        expectedRevision: null,
        text: ISSUE_456_MANUAL_LEARNING_OBJECTIVE,
        scope: { kind: 'quiz-wide' },
        confirmationState: 'confirmed',
      },
    ],
  });
  const objective = saved.objectives.find((candidate) => candidate.id === objectiveId);
  if (
    !objective ||
    objective.origin.kind !== 'manual' ||
    objective.scope.kind !== 'quiz-wide' ||
    objective.confirmation.state !== 'confirmed'
  ) {
    throw new Error('Das manuelle quiz-weite Lernziel wurde nicht bestätigt gespeichert.');
  }
  return {
    count: saved.objectives.length,
    revision: saved.learningContextRevision,
  };
}

export function assertIssue456SummaryRuntimePreflight(runtime) {
  if (runtime?.schemaVersion !== 2) {
    throw new Error(
      'Der lokale Backendprozess stellt nicht den erforderlichen Summary-V2-Vertrag bereit.',
    );
  }
  if (runtime.enabled !== true) {
    throw new Error(
      'Der lokale Backendprozess meldet QA_SUMMARY_ENABLED=false. Das Flag muss beim separaten Backendstart gesetzt werden; eine Variable am Lastgenerator aktiviert das Backend nicht.',
    );
  }
  return {
    schemaVersion: runtime.schemaVersion,
    enabled: runtime.enabled,
    inferenceConfigured: runtime.inferenceConfigured,
    adapterId: runtime.capabilities?.adapterId ?? null,
  };
}

function createParticipantClient(trpcUrl, participant) {
  const capability = String(participant.rejoinToken ?? '').trim();
  if (!capability) {
    throw new Error('Ein Join lieferte keine participant capability.');
  }
  return createHttpTrpcSingle(trpcUrl, undefined, undefined, undefined, capability);
}

async function submitQaCorpus({ trpcUrl, sessionId, participants, corpus, writeConcurrency }) {
  const durations = [];
  const startedAt = performance.now();
  const rowsByParticipant = Array.from({ length: participants.length }, () => []);
  for (const row of corpus) rowsByParticipant[row.participantIndex].push(row);

  const perParticipant = await mapLimit(
    participants.map((participant, participantIndex) => ({ participant, participantIndex })),
    writeConcurrency,
    async ({ participant, participantIndex }) => {
      const trpc = createParticipantClient(trpcUrl, participant);
      let accepted = 0;
      let finalRemaining = null;
      for (const row of rowsByParticipant[participantIndex]) {
        const requestStartedAt = performance.now();
        try {
          const result = await trpc.qa.submit.mutate({
            sessionId,
            participantId: participant.participantId,
            text: row.text,
            idempotencyKey: globalThis.crypto.randomUUID(),
          });
          if (result.replayed) {
            throw new Error('Eine neue Q&A-Frage wurde unerwartet als Replay bestätigt.');
          }
          accepted += 1;
          finalRemaining = result.quota.participantRemaining;
        } finally {
          durations.push(performance.now() - requestStartedAt);
        }
      }
      if (accepted !== ISSUE_456_QUESTIONS_PER_PARTICIPANT || finalRemaining !== 0) {
        throw new Error(
          `Person ${participantIndex + 1}: ${accepted} akzeptiert, Restkontingent ${finalRemaining}.`,
        );
      }
      return accepted;
    },
  );

  const accepted = perParticipant.reduce((sum, count) => sum + count, 0);
  if (accepted !== corpus.length) {
    throw new Error(`Q&A: ${accepted}/${corpus.length} Fragen akzeptiert.`);
  }
  return {
    expected: corpus.length,
    accepted,
    rejected: corpus.length - accepted,
    totalDurationMs: Math.round(performance.now() - startedAt),
    ...summarizeDurations(durations),
  };
}

const TEMPO_VALUES = ['FOLLOWING', 'SPEED_UP', 'SLOW_DOWN', 'LOST'];

async function runQuickFeedback({ code, hostTrpc, trpcUrl, participants, writeConcurrency }) {
  const round = await hostTrpc.quickFeedback.create.mutate({
    type: 'TEMPO',
    sessionCode: code,
  });
  const durations = [];
  const startedAt = performance.now();
  const accepted = await mapLimit(participants, writeConcurrency, async (participant, index) => {
    const trpc = createParticipantClient(trpcUrl, participant);
    const requestStartedAt = performance.now();
    try {
      await trpc.quickFeedback.vote.mutate({
        sessionCode: code,
        voterId: participant.participantId,
        value: TEMPO_VALUES[index % TEMPO_VALUES.length],
      });
      return 1;
    } finally {
      durations.push(performance.now() - requestStartedAt);
    }
  });
  const acceptedCount = accepted.reduce((sum, count) => sum + count, 0);
  if (acceptedCount !== participants.length) {
    throw new Error(`Blitzlicht: ${acceptedCount}/${participants.length} Stimmen akzeptiert.`);
  }
  return {
    type: round.type ?? 'TEMPO',
    expected: participants.length,
    accepted: acceptedCount,
    totalDurationMs: Math.round(performance.now() - startedAt),
    ...summarizeDurations(durations),
  };
}

function summarizeContextPreview(preview) {
  const context = preview.promptContext.context;
  const questions = context.questions;
  return {
    schemaVersion: preview.schemaVersion,
    contractVersion: preview.contractVersion,
    promptContextContract: preview.promptContext.contractVersion,
    snapshotHash: preview.promptContext.snapshotHash,
    instructionVersion: preview.instructionVersion,
    definitionVersion: preview.definitionVersion,
    selectedMode: preview.selectedMode,
    fallback: preview.fallback
      ? { mode: preview.fallback.mode, reason: preview.fallback.reason }
      : null,
    cache: preview.cache,
    adapterId: preview.capabilities.adapterId,
    sourceCount: context.sources.length,
    sections: {
      questions: questions.state,
      topics: context.topics.state,
      compass: context.compass.state,
      learningContext: context.learningContext.state,
      releasedResults: context.releasedResults.state,
      feedback: context.feedback.state,
    },
    questionCorpus: questions.state === 'available' ? questions.corpus : null,
    budget: {
      modelProfile: preview.promptContext.budget.modelProfile,
      contextWindowTokens: preview.promptContext.budget.contextWindowTokens,
      packedInputTokens: preview.promptContext.budget.packedInputTokens,
      reservedOutputTokens: preview.promptContext.budget.reservedOutputTokens,
      safetyMarginTokens: preview.promptContext.budget.safetyMarginTokens,
      truncations: preview.promptContext.budget.truncations,
    },
    limitationCodes: context.limitations.map((limitation) => limitation.code),
  };
}

async function measureHotpathReads(publicTrpc, code, count) {
  const durations = [];
  const results = await Promise.allSettled(
    Array.from({ length: count }, async () => {
      const startedAt = performance.now();
      try {
        return await publicTrpc.session.getInfo.query({ code });
      } finally {
        durations.push(performance.now() - startedAt);
      }
    }),
  );
  const rejected = results.filter((result) => result.status === 'rejected');
  if (rejected.length > 0) {
    throw new Error(
      `Hotpath-Probe: ${rejected.length}/${count} session.getInfo-Aufrufe fehlgeschlagen.`,
    );
  }
  return { requests: count, accepted: count, ...summarizeDurations(durations) };
}

async function waitForSummary(hostTrpc, sessionId, initialRuntime, timeoutMs) {
  let runtime = initialRuntime;
  const deadline = Date.now() + timeoutMs;
  while (runtime.result?.status === 'pending' && Date.now() < deadline) {
    await sleep(250);
    runtime = await hostTrpc.qa.summaryRuntime.query({ sessionId });
  }
  if (!runtime.result || runtime.result.status === 'pending') {
    throw new Error(`Die Moderationszusammenfassung war nach ${timeoutMs} ms nicht fertig.`);
  }
  if (runtime.schemaVersion !== 2) {
    throw new Error('Der Abnahmetest erwartet den versionierten Q&A-Summary-V2-Vertrag.');
  }
  if (runtime.result.status === 'failed') {
    throw new Error('Die Moderationszusammenfassung endete mit Status failed.');
  }
  return runtime;
}

function summarizeRuntime(runtime, enqueueDurationMs, totalDurationMs) {
  return {
    schemaVersion: runtime.schemaVersion,
    enabled: runtime.enabled,
    inferenceConfigured: runtime.inferenceConfigured,
    adapterId: runtime.capabilities?.adapterId ?? null,
    resultContract: runtime.result?.contractVersion ?? null,
    status: runtime.result?.status ?? null,
    effectiveMode: runtime.result?.execution?.effectiveMode ?? null,
    fallback: runtime.result?.execution?.fallback
      ? {
          mode: runtime.result.execution.fallback.mode,
          reason: runtime.result.execution.fallback.reason,
        }
      : null,
    enqueueDurationMs: Math.round(enqueueDurationMs),
    totalDurationMs: Math.round(totalDurationMs),
  };
}

function selectScalarFields(source, fields) {
  const selected = {};
  for (const field of fields) {
    const value = source?.[field];
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      selected[field] = value;
    }
  }
  return selected;
}

function summarizeContextPreviewForReport(preview) {
  const budget = preview?.budget;
  return {
    ...selectScalarFields(preview, [
      'schemaVersion',
      'contractVersion',
      'promptContextContract',
      'snapshotHash',
      'instructionVersion',
      'definitionVersion',
      'selectedMode',
      'cache',
      'adapterId',
      'sourceCount',
    ]),
    fallback: preview?.fallback ? selectScalarFields(preview.fallback, ['mode', 'reason']) : null,
    sections: selectScalarFields(preview?.sections, [
      'questions',
      'topics',
      'compass',
      'learningContext',
      'releasedResults',
      'feedback',
    ]),
    questionCorpus: preview?.questionCorpus
      ? selectScalarFields(preview.questionCorpus, [
          'total',
          'eligible',
          'analyzed',
          'deduplicated',
          'represented',
        ])
      : null,
    budget: budget
      ? {
          ...selectScalarFields(budget, [
            'modelProfile',
            'contextWindowTokens',
            'packedInputTokens',
            'reservedOutputTokens',
            'safetyMarginTokens',
          ]),
          truncations: Array.isArray(budget.truncations)
            ? budget.truncations.map((truncation) =>
                selectScalarFields(truncation, ['section', 'omittedItems', 'reason']),
              )
            : [],
        }
      : null,
    limitationCodes: Array.isArray(preview?.limitationCodes)
      ? preview.limitationCodes.filter((code) => typeof code === 'string')
      : [],
  };
}

function summarizeExtensionMetricsForReport(extension) {
  return {
    qa: selectScalarFields(extension?.qa, [
      'expected',
      'accepted',
      'rejected',
      'totalDurationMs',
      'p50Ms',
      'p95Ms',
      'maxMs',
    ]),
    quickFeedback: selectScalarFields(extension?.quickFeedback, [
      'type',
      'expected',
      'accepted',
      'totalDurationMs',
      'p50Ms',
      'p95Ms',
      'maxMs',
    ]),
    learningObjectives: selectScalarFields(extension?.learningObjectives, ['count', 'revision']),
    contextPreview: summarizeContextPreviewForReport(extension?.contextPreview),
    summary: {
      ...selectScalarFields(extension?.summary, [
        'schemaVersion',
        'enabled',
        'inferenceConfigured',
        'adapterId',
        'resultContract',
        'status',
        'effectiveMode',
        'enqueueDurationMs',
        'totalDurationMs',
      ]),
      fallback: extension?.summary?.fallback
        ? selectScalarFields(extension.summary.fallback, ['mode', 'reason'])
        : null,
    },
    hotpathReads: selectScalarFields(extension?.hotpathReads, [
      'requests',
      'accepted',
      'p50Ms',
      'p95Ms',
      'maxMs',
    ]),
    networkModel:
      typeof extension?.networkModel === 'string' ? extension.networkModel : 'unavailable',
  };
}

function summarizeQuestionResultForReport(question) {
  return {
    questionNumber: question.questionNumber,
    order: question.order,
    type: question.type,
    openedAs: question.openedAs,
    resultsStatus: question.resultsStatus,
    expectedVotesPerRound: question.expectedVotesPerRound,
    voteRounds: question.voteRounds.map((round) => ({
      round: round.round,
      accepted: round.accepted,
      rejected: round.rejected,
      totalDurationMs: round.totalDurationMs,
      p50Ms: round.p50Ms,
      p95Ms: round.p95Ms,
      maxMs: round.maxMs,
    })),
  };
}

/**
 * Explicit allow-list for the persisted acceptance report. In particular this
 * excludes session/quiz/person identifiers, capabilities, question/prompt text
 * and raw model input/output. Numeric context budget counters remain observable.
 */
export function buildIssue456AcceptanceReportMetrics(summary) {
  const extension = summarizeExtensionMetricsForReport(summary.extensionMetrics);
  return {
    scenario: 'issue-456-demo-acceptance',
    participants: summary.participants,
    questions: summary.questions,
    expectedVotes: summary.expectedVotes,
    totalVotesAccepted: summary.totalVotesAccepted,
    feedbackAccepted: summary.feedbackAccepted,
    finishedStatus: summary.finishedStatus,
    durationMs: summary.durationMs,
    ...extension,
    questionResults: summary.questionResults.map(summarizeQuestionResultForReport),
  };
}

export function buildIssue456AcceptanceReportEnvironment({
  trpcUrl,
  participantCount,
  questionsPerParticipant,
  expectedQaQuestions,
  networkModel,
}) {
  return {
    target: new URL(trpcUrl).origin,
    canonicalDemoQuiz: CANONICAL_DEMO_QUIZ_REPOSITORY_PATH,
    participants: participantCount,
    questionsPerParticipant,
    expectedQaQuestions,
    networkModel,
  };
}

export async function runIssue456DemoAcceptance(options = {}) {
  const participantCount = positiveInteger(
    options.participants ?? process.env.ISSUE_456_PARTICIPANTS ?? ISSUE_456_MIN_PARTICIPANTS,
    'participants',
  );
  const questionsPerParticipant = positiveInteger(
    options.questionsPerParticipant ??
      process.env.ISSUE_456_QUESTIONS_PER_PARTICIPANT ??
      ISSUE_456_QUESTIONS_PER_PARTICIPANT,
    'questionsPerParticipant',
  );
  const writeConcurrency = positiveInteger(
    options.writeConcurrency ?? process.env.ISSUE_456_WRITE_CONCURRENCY ?? 25,
    'writeConcurrency',
  );
  const summaryWaitMs = positiveInteger(
    options.summaryWaitMs ?? process.env.ISSUE_456_SUMMARY_WAIT_MS ?? 120_000,
    'summaryWaitMs',
  );
  const trpcUrl = assertIssue456LocalTrpcTarget(
    options.trpcUrl ?? process.env.TRPC_URL ?? 'http://127.0.0.1:3000/trpc',
  );
  if (process.env.SESSION_CODE) {
    throw new Error(
      'SESSION_CODE ist für diesen Abnahmetest unzulässig; er erstellt immer das kanonische Demo-Quiz neu.',
    );
  }
  const requestedLocale = String(
    process.env.QUIZ_CONTENT_LOCALE ?? process.env.DEMO_QUIZ_LOCALE ?? 'de',
  )
    .trim()
    .slice(0, 2)
    .toLowerCase();
  if (requestedLocale !== 'de') {
    throw new Error('Der Issue-#456-Abnahmetest verwendet verbindlich das deutsche Demo-Quiz.');
  }

  const validation = await validateIssue456DemoAcceptance({
    participants: participantCount,
    questionsPerParticipant,
  });
  const corpus = buildIssue456DemoQaCorpus(participantCount, questionsPerParticipant);

  const result = await runDemoQuizClassroom({
    trpcUrl,
    participants: participantCount,
    expectedQuestions: EXPECTED_DEMO_QUESTION_COUNT,
    joinConcurrency: options.joinConcurrency ?? 25,
    qaEnabled: true,
    qaModerationMode: false,
    quickFeedbackEnabled: true,
    writeReport: false,
    log: false,
    beforeParticipantsJoined: async ({ hostTrpc, code, sessionId }) => {
      const summaryRuntime = await hostTrpc.qa.summaryRuntime.query({ sessionId });
      assertIssue456SummaryRuntimePreflight(summaryRuntime);
      const learningObjectives = await saveIssue456ManualLearningObjective(hostTrpc, code);
      await configureQaSessionIfNeeded(hostTrpc, code, {
        qaTitle: 'Fragen zum Demo-Quiz und zu arsnova.eu',
        moderationMode: false,
        participationProfile: {
          identityMode: 'PRESET_PSEUDONYM',
          nicknameTheme: 'KINDERGARTEN',
        },
      });
      return { qaConfigured: true, learningObjectives };
    },
    afterParticipantsJoined: async (context) => {
      const qa = await submitQaCorpus({
        ...context,
        corpus,
        writeConcurrency,
      });
      const quickFeedback = await runQuickFeedback({
        ...context,
        writeConcurrency,
      });
      return {
        qa,
        quickFeedback,
        learningObjectives: context.preparation.learningObjectives,
      };
    },
    afterQuestionsCompleted: async ({ sessionId, code, hostTrpc, publicTrpc, extensionState }) => {
      const preview = await hostTrpc.qa.summaryContextPreview.query({
        sessionId,
        locale: 'de',
      });
      if (
        preview.contractVersion !== 'qa-summary-context-preview-v1' ||
        preview.promptContext.contractVersion !== 'moderation-prompt-context-v1'
      ) {
        throw new Error(
          'Die Kontextvorschau verwendet nicht die erwarteten versionierten Verträge.',
        );
      }
      const summaryStartedAt = performance.now();
      const enqueueStartedAt = performance.now();
      const pendingRuntime = await hostTrpc.qa.requestSummary.mutate({
        sessionId,
        locale: 'de',
      });
      const enqueueDurationMs = performance.now() - enqueueStartedAt;
      if (pendingRuntime.schemaVersion !== 2 || pendingRuntime.result?.status !== 'pending') {
        throw new Error('Die Summary-Anfrage lieferte keinen versionierten Pending-Status.');
      }

      // Read-only live traffic runs after enqueueing and therefore while a real
      // adapter may be working. It must never wait for the model response.
      const hotpathReads = await measureHotpathReads(publicTrpc, code, 25);
      const runtime = await waitForSummary(hostTrpc, sessionId, pendingRuntime, summaryWaitMs);
      return {
        ...extensionState,
        contextPreview: summarizeContextPreview(preview),
        summary: summarizeRuntime(runtime, enqueueDurationMs, performance.now() - summaryStartedAt),
        hotpathReads,
        networkModel: validation.networkModel,
      };
    },
  });

  const failures = [...result.failures];
  const reportMetrics = buildIssue456AcceptanceReportMetrics(result.summary);
  await writeScenarioReport({
    scenario: 'issue-456-demo-acceptance',
    environment: buildIssue456AcceptanceReportEnvironment({
      trpcUrl,
      participantCount,
      questionsPerParticipant,
      expectedQaQuestions: corpus.length,
      networkModel: validation.networkModel,
    }),
    metrics: reportMetrics,
    failures,
  });
  return { validation, ...result, reportMetrics };
}

export function parseIssue456AcceptanceMode(argv) {
  const supported = new Set(['--validate', '--run']);
  const unknown = argv.filter((argument) => !supported.has(argument));
  if (unknown.length > 0) {
    throw new Error(`Unbekannte Option: ${unknown.join(', ')}`);
  }
  const validate = argv.includes('--validate');
  const run = argv.includes('--run');
  if (validate === run) {
    throw new Error('Genau eine Betriebsart ist erforderlich: --validate oder --run.');
  }
  return validate ? 'validate' : 'run';
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  Promise.resolve()
    .then(async () => {
      const mode = parseIssue456AcceptanceMode(process.argv.slice(2));
      if (mode === 'validate') {
        const validation = await validateIssue456DemoAcceptance({
          participants: process.env.ISSUE_456_PARTICIPANTS ?? ISSUE_456_MIN_PARTICIPANTS,
          questionsPerParticipant:
            process.env.ISSUE_456_QUESTIONS_PER_PARTICIPANT ?? ISSUE_456_QUESTIONS_PER_PARTICIPANT,
        });
        console.log(JSON.stringify(validation, null, 2));
        return;
      }
      const result = await runIssue456DemoAcceptance();
      if (result.failures.length > 0) {
        for (const failure of result.failures) console.error(`- ${failure}`);
        process.exitCode = 1;
        return;
      }
      console.log(
        JSON.stringify({ validation: result.validation, metrics: result.reportMetrics }, null, 2),
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
