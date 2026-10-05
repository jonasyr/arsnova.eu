import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  ISSUE_456_ARSNOVA_QUESTIONS,
  ISSUE_456_DEMO_QUIZ_QUESTIONS,
  ISSUE_456_MIN_PARTICIPANTS,
  ISSUE_456_QUESTIONS_PER_PARTICIPANT,
  buildIssue456DemoQaCorpus,
  buildIssue456ParticipantQuestions,
  summarizeIssue456Corpus,
} from './lib/issue-456-demo-qa-corpus.mjs';
import {
  assertIssue456LocalTrpcTarget,
  assertIssue456SummaryRuntimePreflight,
  buildIssue456AcceptanceReportEnvironment,
  buildIssue456AcceptanceReportMetrics,
  parseIssue456AcceptanceMode,
  saveIssue456ManualLearningObjective,
  validateIssue456DemoAcceptance,
} from './issue-456-demo-acceptance.mjs';
import { runWithSessionFailureCleanup } from './demo-quiz-classroom-30.mjs';

const execFileAsync = promisify(execFile);
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, '../..');
const runnerPath = resolve(testDirectory, 'issue-456-demo-acceptance.mjs');

test('verwendet das kanonische deutsche Demo-Quiz mit 13 Fragen und zehn Fragetypen', async () => {
  const validation = await validateIssue456DemoAcceptance();
  const raw = JSON.parse(await readFile(validation.canonicalQuiz.path, 'utf8'));

  assert.equal(validation.canonicalQuiz.name, 'Praxis-Showcase: Team-Quiz');
  assert.equal(validation.canonicalQuiz.questions, 13);
  assert.equal(validation.canonicalQuiz.questionTypes.length, 10);
  assert.equal(raw.quiz.questions.length, 13);
  assert.match(raw.quiz.description, /zehn Quiz-Fragetypen/);
});

test('erstellt für mindestens 250 Teilnehmende jeweils genau zehn sinnvolle Fragen', () => {
  const corpus = buildIssue456DemoQaCorpus();
  const summary = summarizeIssue456Corpus(corpus);

  assert.equal(summary.participants, ISSUE_456_MIN_PARTICIPANTS);
  assert.equal(summary.questions, ISSUE_456_MIN_PARTICIPANTS * ISSUE_456_QUESTIONS_PER_PARTICIPANT);
  assert.ok(summary.questions >= 2_500);
  assert.ok(
    summary.questionsPerParticipant.every((count) => count === ISSUE_456_QUESTIONS_PER_PARTICIPANT),
  );
  assert.equal(summary.scopes['demo-quiz'], 1_250);
  assert.equal(summary.scopes['arsnova.eu'], 1_250);
  assert.equal(summary.uniqueTexts, 50);
});

test('jede Person erhält fünf verschiedene Demo- und fünf verschiedene App-Fragen', () => {
  for (const participantIndex of [0, 1, 42, 249]) {
    const questions = buildIssue456ParticipantQuestions(participantIndex);
    assert.equal(questions.length, 10);
    assert.equal(new Set(questions.map((question) => question.text)).size, 10);
    assert.equal(questions.filter((question) => question.scope === 'demo-quiz').length, 5);
    assert.equal(questions.filter((question) => question.scope === 'arsnova.eu').length, 5);
    for (const question of questions) {
      assert.ok([...question.text].length >= 20);
      assert.ok([...question.text].length <= 500);
      assert.ok(question.text.endsWith('?'));
      assert.doesNotMatch(question.text, /\bTN\s*\d|Teilnehmer(?:in)?\s*\d/i);
    }
  }
});

test('der kuratierte Korpus deckt konkrete Demo- und arsnova.eu-Themen ab', () => {
  const demoText = ISSUE_456_DEMO_QUIZ_QUESTIONS.join(' ');
  const appText = ISSUE_456_ARSNOVA_QUESTIONS.join(' ');

  assert.equal(ISSUE_456_DEMO_QUIZ_QUESTIONS.length, 25);
  assert.equal(ISSUE_456_ARSNOVA_QUESTIONS.length, 25);
  assert.match(demoText, /Wortwolke/);
  assert.match(demoText, /Peer Instruction/);
  assert.match(demoText, /Französischen Revolution/);
  assert.match(demoText, /Genexpression/);
  assert.match(appText, /Q&A/);
  assert.match(appText, /Blitzlicht/);
  assert.match(appText, /Campus-IP-Adresse/);
  assert.match(appText, /Kontextvorschau/);
  assert.match(appText, /barrierearm/);
});

test('verweigert kleinere oder produktseitig unmögliche Lastprofile', () => {
  assert.throws(() => buildIssue456DemoQaCorpus(249, 10), /mindestens 250/);
  assert.throws(() => buildIssue456DemoQaCorpus(250, 9), /genau 10 Fragen/);
  assert.throws(() => buildIssue456DemoQaCorpus(250, 11), /genau 10 Fragen/);
});

test('akzeptiert nur explizite lokale HTTP-tRPC-Ziele', () => {
  assert.equal(
    assertIssue456LocalTrpcTarget('http://127.0.0.1:3000/trpc'),
    'http://127.0.0.1:3000/trpc',
  );
  assert.equal(
    assertIssue456LocalTrpcTarget('http://localhost:3000/trpc'),
    'http://localhost:3000/trpc',
  );
  assert.throws(
    () => assertIssue456LocalTrpcTarget('https://arsnova.eu/trpc'),
    /ausschließlich lokales HTTP/,
  );
  assert.throws(
    () => assertIssue456LocalTrpcTarget('http://arsnova.eu/trpc'),
    /verweigert das nichtlokale Ziel/,
  );
  assert.throws(
    () => assertIssue456LocalTrpcTarget('http://localhost:3000/api'),
    /lokalen \/trpc-Endpunkt/,
  );
});

test('erzwingt genau eine explizite Betriebsart', () => {
  assert.equal(parseIssue456AcceptanceMode(['--validate']), 'validate');
  assert.equal(parseIssue456AcceptanceMode(['--run']), 'run');
  assert.throws(() => parseIssue456AcceptanceMode([]), /Genau eine Betriebsart/);
  assert.throws(
    () => parseIssue456AcceptanceMode(['--validate', '--run']),
    /Genau eine Betriebsart/,
  );
  assert.throws(() => parseIssue456AcceptanceMode(['--unsafe']), /Unbekannte Option/);
});

test('legt vor dem Lastlauf ein bestätigtes manuelles quiz-weites Lernziel an', async () => {
  const calls = [];
  const objectiveId = '69b8c865-339c-4d05-9f9e-279fb0df28bf';
  const hostTrpc = {
    session: {
      getLearningObjectives: {
        query: async (input) => {
          calls.push(['get', input]);
          return {
            access: { state: 'writable' },
            learningContextRevision: 0,
            availableQuizTasks: Array.from({ length: 13 }, (_, index) => ({
              questionId: `question-${index}`,
            })),
            objectives: [],
          };
        },
      },
      saveLearningObjectives: {
        mutate: async (input) => {
          calls.push(['save', input]);
          return {
            learningContextRevision: 1,
            objectives: [
              {
                id: objectiveId,
                origin: { kind: 'manual' },
                scope: { kind: 'quiz-wide' },
                confirmation: { state: 'confirmed' },
              },
            ],
          };
        },
      },
    },
  };

  const report = await saveIssue456ManualLearningObjective(hostTrpc, 'ABC123', () => objectiveId);

  assert.deepEqual(report, { count: 1, revision: 1 });
  assert.deepEqual(calls[0], ['get', { code: 'ABC123' }]);
  assert.deepEqual(calls[1][1], {
    code: 'ABC123',
    expectedLearningContextRevision: 0,
    mutations: [
      {
        action: 'upsert',
        objectiveId,
        expectedRevision: null,
        text: calls[1][1].mutations[0].text,
        scope: { kind: 'quiz-wide' },
        confirmationState: 'confirmed',
      },
    ],
  });
  assert.match(calls[1][1].mutations[0].text, /zehn Fragetypen.*Nachbesprechung/);
  assert.doesNotMatch(JSON.stringify(report), /Fragetypen|Nachbesprechung|69b8c865/);
});

test('--validate bleibt auch mit externer TRPC_URL vollständig netzwerkfrei', async () => {
  const { stdout } = await execFileAsync(process.execPath, [runnerPath, '--validate'], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      TRPC_URL: 'https://arsnova.eu/trpc',
      ISSUE_456_PARTICIPANTS: '250',
      ISSUE_456_QUESTIONS_PER_PARTICIPANT: '10',
    },
    timeout: 15_000,
  });
  const validation = JSON.parse(stdout);
  assert.equal(validation.mode, 'network-free-validation');
  assert.equal(validation.corpus.participants, 250);
  assert.equal(validation.corpus.questions, 2_500);
});

test('verweigert den Lastlauf vor dem ersten Join, wenn Summary V2 im Backend aus ist', () => {
  assert.throws(
    () =>
      assertIssue456SummaryRuntimePreflight({
        schemaVersion: 2,
        enabled: false,
        inferenceConfigured: false,
        capabilities: { adapterId: 'extractive' },
      }),
    /Backendprozess meldet QA_SUMMARY_ENABLED=false/,
  );
  assert.deepEqual(
    assertIssue456SummaryRuntimePreflight({
      schemaVersion: 2,
      enabled: true,
      inferenceConfigured: false,
      capabilities: { adapterId: 'extractive' },
    }),
    {
      schemaVersion: 2,
      enabled: true,
      inferenceConfigured: false,
      adapterId: 'extractive',
    },
  );
});

test('beendet die Demo-Session idempotent, wenn ein Erweiterungsschritt fehlschlägt', async () => {
  const primaryError = new Error('summary-preflight-failed');
  const cleanupCalls = [];
  const hostTrpc = {
    session: {
      end: {
        mutate: async (input) => {
          cleanupCalls.push(input);
        },
      },
    },
  };

  await assert.rejects(
    runWithSessionFailureCleanup(hostTrpc, 'ABC123', true, async () => {
      throw primaryError;
    }),
    (error) => error === primaryError,
  );
  assert.deepEqual(cleanupCalls, [{ code: 'ABC123' }]);
});

test('--run verweigert ein externes Ziel vor einem Backendzugriff', async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [runnerPath, '--run'], {
      cwd: repositoryRoot,
      env: { ...process.env, TRPC_URL: 'https://arsnova.eu/trpc' },
      timeout: 15_000,
    }),
    (error) => {
      assert.match(error.stderr, /ausschließlich lokales HTTP/);
      return true;
    },
  );
});

test('die Report-Projektion entfernt Texte, Tokens und Personenkennungen', () => {
  const report = buildIssue456AcceptanceReportMetrics({
    scenario: 'demo-quiz-classroom',
    code: 'ABC123',
    quizId: 'quiz-secret',
    participants: 250,
    questions: 13,
    expectedVotes: 3_500,
    totalVotesAccepted: 3_500,
    feedbackAccepted: 250,
    finishedStatus: 'FINISHED',
    durationMs: 123,
    extensionMetrics: {
      qa: { expected: 2_500, accepted: 2_500, rejected: 0 },
      quickFeedback: { expected: 250, accepted: 250 },
      learningObjectives: { count: 1, revision: 1 },
      contextPreview: { contractVersion: 'qa-summary-context-preview-v1' },
      summary: {
        status: 'ready',
        effectiveMode: 'extractive',
        modelVersion: 'model-output-secret',
        rawOutput: 'raw-model-output-secret',
      },
      hotpathReads: { requests: 25, accepted: 25 },
      networkModel: 'single-local-runner-shared-source-address',
      participantId: 'participant-secret',
      hostToken: 'host-token-secret',
      promptText: 'prompt-secret',
    },
    questionResults: [
      {
        questionNumber: 1,
        order: 0,
        type: 'SURVEY',
        title: 'kanonischer-fragetext-secret',
        openedAs: 'ACTIVE',
        resultsStatus: 'RESULTS',
        expectedVotesPerRound: 250,
        voteRounds: [
          {
            round: 1,
            accepted: 250,
            rejected: 0,
            totalDurationMs: 100,
            p50Ms: 2,
            p95Ms: 4,
            maxMs: 5,
            errors: { 'server-text-secret': 1 },
          },
        ],
      },
    ],
  });
  const serialized = JSON.stringify(report);

  assert.doesNotMatch(serialized, /ABC123|quiz-secret|participant-secret/);
  assert.doesNotMatch(serialized, /host-token-secret|prompt-secret/);
  assert.doesNotMatch(serialized, /model-output-secret|raw-model-output-secret/);
  assert.doesNotMatch(serialized, /kanonischer-fragetext-secret|server-text-secret/);
  assert.equal(report.qa.accepted, 2_500);
  assert.deepEqual(report.learningObjectives, { count: 1, revision: 1 });
  assert.equal(report.questionResults[0].voteRounds[0].accepted, 250);
});

test('der persistierte Report verwendet keinen absoluten Benutzerpfad', () => {
  const environment = buildIssue456AcceptanceReportEnvironment({
    trpcUrl: 'http://127.0.0.1:3000/trpc',
    participantCount: 250,
    questionsPerParticipant: 10,
    expectedQaQuestions: 2_500,
    networkModel: 'single-local-runner-shared-source-address',
  });

  assert.equal(
    environment.canonicalDemoQuiz,
    'apps/frontend/src/assets/demo/quiz-demo-showcase.de.json',
  );
  assert.equal(environment.canonicalDemoQuiz.startsWith('/'), false);
  assert.doesNotMatch(JSON.stringify(environment), /\/Users\/|\\Users\\/);
});
