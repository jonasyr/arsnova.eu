import {
  QA_SUMMARY_RESULT_V2_CONTRACT_VERSION,
  QA_SUMMARY_V2_SCHEMA_VERSION,
  QaSummaryExecutionV2Schema,
  QaSummaryResultV2Schema,
  type AppLocale,
  type QaSummaryContextPreviewDTO,
  type QaSummaryFallbackReason,
  type QaSummaryResultV2,
  type QaSummaryRuntimeV2DTO,
} from '@arsnova/shared-types';
import type { HostTokenContext } from './hostAuth';
import { logger } from './logger';
import {
  createQaSummaryFallback,
  prepareFreshModerationSummaryContext,
  resolveQaSummaryAdapterPlan,
  type PreparedModerationSummaryContext,
  type QaSummaryAdapterPlan,
} from './moderationSummaryContext';
import { createExtractiveQaSummaryOutput } from './qaSummaryExtractive';
import { resolveQaSummaryConfig, type QaSummaryConfig } from './qaSummaryConfig';
import { runPreparedQaSummary, type QaSummaryPreparedRun } from './qaSummaryRuntimeAdapter';
import { bindQaSummaryModelOutputV2, createPendingQaSummaryResultV2 } from './qaSummaryValidateV2';
import { registerSessionPurgeInvalidator } from './sessionPurgeInvalidation';

export type QaSummaryContextPreparer = (input: {
  readonly sessionId: string;
  readonly locale: AppLocale;
  readonly access: HostTokenContext;
}) => Promise<PreparedModerationSummaryContext>;

export type QaSummaryV2Processor = (
  prepared: PreparedModerationSummaryContext,
  options: { readonly signal: AbortSignal },
) => Promise<QaSummaryPreparedRun>;

type SessionSummaryState = {
  result: QaSummaryResultV2;
  inflight: boolean;
  lastFinishedAt: number | null;
  expiresAt: number;
  generation: number;
};

type EphemeralHostAccess = { hostToken?: string };

type QueueJob = {
  readonly sessionId: string;
  readonly locale: AppLocale;
  readonly generation: number;
  readonly access: EphemeralHostAccess;
};

type QueueHooks = {
  prepare: QaSummaryContextPreparer;
  processor: QaSummaryV2Processor;
  config: () => QaSummaryConfig;
  plan: () => QaSummaryAdapterPlan;
  now: () => number;
  schedule: (fn: () => void) => void;
};

const states = new Map<string, SessionSummaryState>();
const queue: QueueJob[] = [];
const pendingTimers: ReturnType<typeof setImmediate>[] = [];
const invalidatedSessions = new Map<string, number>();
const activeJobs = new Map<string, { generation: number; controller: AbortController }>();
let running = 0;
let nextGeneration = 1;

const queueMetrics = {
  completed: 0,
  failed: 0,
  timeouts: 0,
  cacheHits: 0,
  queueRejected: 0,
  lastLatencyMs: null as number | null,
};

function createDefaultHooks(): QueueHooks {
  return {
    prepare: prepareFreshModerationSummaryContext,
    processor: (prepared, options) => runPreparedQaSummary(prepared, options),
    config: () => resolveQaSummaryConfig(),
    plan: () => resolveQaSummaryAdapterPlan(),
    now: () => Date.now(),
    schedule: (fn) => {
      const timer = setImmediate(() => {
        const index = pendingTimers.indexOf(timer);
        if (index >= 0) pendingTimers.splice(index, 1);
        fn();
      });
      pendingTimers.push(timer);
    },
  };
}

let hooks: QueueHooks = createDefaultHooks();

function clearEphemeralAccess(job: QueueJob): void {
  job.access.hostToken = undefined;
}

function cloneMinimalHostAccess(access: HostTokenContext): EphemeralHostAccess {
  const hostToken = access.hostToken?.trim();
  if (!hostToken) {
    throw new Error('Q&A-Summary-Queue benötigt einen bereits validierten Host-Token.');
  }
  return { hostToken };
}

function isSessionInvalidated(sessionId: string): boolean {
  const invalidatedUntil = invalidatedSessions.get(sessionId);
  if (invalidatedUntil === undefined) return false;
  if (invalidatedUntil <= Date.now()) {
    invalidatedSessions.delete(sessionId);
    return false;
  }
  return true;
}

export function invalidateQaSummaryForSession(sessionId: string): void {
  invalidatedSessions.set(sessionId, Date.now() + 60_000);
  states.delete(sessionId);
  activeJobs.get(sessionId)?.controller.abort(new Error('QA_SUMMARY_PURGED'));
  activeJobs.delete(sessionId);
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const job = queue[index];
    if (job?.sessionId !== sessionId) continue;
    clearEphemeralAccess(job);
    queue.splice(index, 1);
  }
}

registerSessionPurgeInvalidator((event) => invalidateQaSummaryForSession(event.sessionId));

function pruneExpired(sessionId: string, now: number): void {
  const state = states.get(sessionId);
  if (state && !state.inflight && state.expiresAt <= now) states.delete(sessionId);
}

function toRuntime(sessionId: string): QaSummaryRuntimeV2DTO {
  const config = hooks.config();
  const plan = hooks.plan();
  const now = hooks.now();
  pruneExpired(sessionId, now);
  return {
    schemaVersion: QA_SUMMARY_V2_SCHEMA_VERSION,
    enabled: config.enabled,
    inferenceConfigured: plan.inferenceConfigured,
    capabilities: plan.capabilities,
    result: states.get(sessionId)?.result ?? null,
  };
}

function hasMinimumSummaryCorpus(prepared: PreparedModerationSummaryContext): boolean {
  const questions = prepared.request.promptContext.context.questions;
  return questions.state === 'available' && questions.corpus.eligible >= 3;
}

function extractiveExecution(
  reason: QaSummaryFallbackReason,
  attemptedMode: 'full-context' | 'legacy-text' | null,
  retry: 'manual' | 'not-applicable' = 'manual',
) {
  return QaSummaryExecutionV2Schema.parse({
    attemptedMode,
    effectiveMode: 'extractive',
    fallback: createQaSummaryFallback('extractive', reason, retry),
  });
}

function bindExtractiveResult(
  prepared: PreparedModerationSummaryContext,
  reason: QaSummaryFallbackReason,
  analyzedAt: string,
  attemptedMode: 'full-context' | 'legacy-text' | null = prepared.plan.selectedMode,
  retry: 'manual' | 'not-applicable' = 'manual',
): QaSummaryResultV2 {
  return bindQaSummaryModelOutputV2({
    output: createExtractiveQaSummaryOutput(prepared.request.promptContext),
    prepared,
    execution: extractiveExecution(reason, attemptedMode, retry),
    analyzedAt,
  });
}

function createUnavailableResult(input: {
  readonly pending: QaSummaryResultV2;
  readonly reason: QaSummaryFallbackReason;
  readonly analyzedAt: string;
}): QaSummaryResultV2 {
  return QaSummaryResultV2Schema.parse({
    schemaVersion: QA_SUMMARY_V2_SCHEMA_VERSION,
    contractVersion: QA_SUMMARY_RESULT_V2_CONTRACT_VERSION,
    status: 'failed',
    statements: [],
    suggestedNextSteps: [],
    limitations: ['Die Zusammenfassung ist gerade nicht verfügbar.'],
    sources: [],
    modelVersion: `fallback:${input.reason}`,
    analyzedAt: input.analyzedAt,
    snapshotHash: input.pending.snapshotHash,
    locale: input.pending.locale,
    execution: {
      attemptedMode: null,
      effectiveMode: 'rule-based',
      fallback: createQaSummaryFallback('rule-based', input.reason),
    },
  });
}

function tooFewQuestionsResult(
  prepared: PreparedModerationSummaryContext,
  analyzedAt: string,
): QaSummaryResultV2 {
  const context = prepared.request.promptContext;
  return QaSummaryResultV2Schema.parse({
    schemaVersion: QA_SUMMARY_V2_SCHEMA_VERSION,
    contractVersion: QA_SUMMARY_RESULT_V2_CONTRACT_VERSION,
    status: 'uncertain',
    statements: [],
    suggestedNextSteps: [],
    limitations: ['Es gibt noch zu wenige sichtbare Fragen für eine Zusammenfassung.'],
    sources: [],
    analyzedAt,
    snapshotHash: context.snapshotHash,
    locale: context.context.locale,
    execution: {
      attemptedMode: null,
      effectiveMode: 'rule-based',
      fallback: createQaSummaryFallback('rule-based', 'context_unavailable'),
    },
  });
}

function summarizeQaSummaryCatch(error: unknown): { errorName: string; errorMessage: string } {
  if (!(error instanceof Error)) return { errorName: 'unknown', errorMessage: 'non-error' };
  return {
    errorName: error.name.slice(0, 40),
    errorMessage: error.message.replace(/\s+/g, ' ').slice(0, 160),
  };
}

function fallbackReasonForError(error: unknown): QaSummaryFallbackReason {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    ((error as { code?: unknown }).code === 'UNAUTHORIZED' ||
      (error as { code?: unknown }).code === 'FORBIDDEN')
  ) {
    return 'permission_changed';
  }
  return 'context_unavailable';
}

async function runWithQueueTimeout(input: {
  readonly job: QueueJob;
  readonly prepared: PreparedModerationSummaryContext;
  readonly timeoutMs: number;
}): Promise<{ status: 'completed'; run: QaSummaryPreparedRun } | { status: 'timeout' }> {
  const controller = new AbortController();
  activeJobs.set(input.job.sessionId, { generation: input.job.generation, controller });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ status: 'timeout' }>((resolve) => {
    timer = setTimeout(() => {
      controller.abort(new Error('QA_SUMMARY_TIMEOUT'));
      resolve({ status: 'timeout' });
    }, input.timeoutMs);
  });
  try {
    return await Promise.race([
      hooks
        .processor(input.prepared, { signal: controller.signal })
        .then((run) => ({ status: 'completed' as const, run })),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    const active = activeJobs.get(input.job.sessionId);
    if (active?.generation === input.job.generation) activeJobs.delete(input.job.sessionId);
  }
}

function stateMatchesJob(job: QueueJob): boolean {
  const state = states.get(job.sessionId);
  return state?.inflight === true && state.generation === job.generation;
}

async function processJob(job: QueueJob): Promise<void> {
  const started = hooks.now();
  const config = hooks.config();
  try {
    if (isSessionInvalidated(job.sessionId) || !stateMatchesJob(job)) return;
    const preparedBefore = await hooks.prepare({
      sessionId: job.sessionId,
      locale: job.locale,
      access: job.access,
    });
    if (isSessionInvalidated(job.sessionId) || !stateMatchesJob(job)) return;

    const currentState = states.get(job.sessionId);
    if (!currentState) return;
    if (!hasMinimumSummaryCorpus(preparedBefore)) {
      states.set(job.sessionId, {
        ...currentState,
        result: tooFewQuestionsResult(preparedBefore, new Date(hooks.now()).toISOString()),
        inflight: false,
        lastFinishedAt: hooks.now(),
        expiresAt: hooks.now() + config.ttlMs,
      });
      queueMetrics.completed += 1;
      queueMetrics.lastLatencyMs = hooks.now() - started;
      return;
    }

    if (currentState.result.snapshotHash !== preparedBefore.request.promptContext.snapshotHash) {
      states.set(job.sessionId, {
        ...currentState,
        result: createPendingQaSummaryResultV2(preparedBefore),
      });
    }

    const run = await runWithQueueTimeout({
      job,
      prepared: preparedBefore,
      timeoutMs: config.timeoutMs,
    });
    if (isSessionInvalidated(job.sessionId) || !stateMatchesJob(job)) return;

    const preparedAfter = await hooks.prepare({
      sessionId: job.sessionId,
      locale: job.locale,
      access: job.access,
    });
    if (isSessionInvalidated(job.sessionId) || !stateMatchesJob(job)) return;

    const analyzedAt = new Date(hooks.now()).toISOString();
    const sourceChanged =
      preparedAfter.request.promptContext.snapshotHash !==
      preparedBefore.request.promptContext.snapshotHash;
    const result = sourceChanged
      ? bindExtractiveResult(preparedAfter, 'source_changed', analyzedAt)
      : run.status === 'timeout'
        ? bindExtractiveResult(preparedAfter, 'timeout', analyzedAt)
        : bindQaSummaryModelOutputV2({
            output: run.run.output,
            prepared: preparedAfter,
            execution: run.run.execution,
            analyzedAt,
          });

    const state = states.get(job.sessionId);
    if (!state || state.generation !== job.generation) return;
    states.set(job.sessionId, {
      result,
      inflight: false,
      lastFinishedAt: hooks.now(),
      expiresAt: hooks.now() + config.ttlMs,
      generation: job.generation,
    });
    logger.info('qa_summary:completed', {
      status: result.status,
      effectiveMode: result.execution.effectiveMode,
      fallbackReason: result.execution.fallback?.reason ?? null,
      latencyMs: hooks.now() - started,
    });
    queueMetrics.completed += 1;
    queueMetrics.lastLatencyMs = hooks.now() - started;
    if (run.status === 'timeout') queueMetrics.timeouts += 1;
  } catch (error) {
    if (isSessionInvalidated(job.sessionId) || !stateMatchesJob(job)) return;
    const fallbackReason = fallbackReasonForError(error);
    const state = states.get(job.sessionId);
    if (state) {
      states.set(job.sessionId, {
        ...state,
        result: createUnavailableResult({
          pending: state.result,
          reason: fallbackReason,
          analyzedAt: new Date(hooks.now()).toISOString(),
        }),
        inflight: false,
        lastFinishedAt: hooks.now(),
        expiresAt: hooks.now() + config.ttlMs,
      });
    }
    logger.warn('qa_summary:failed', {
      reason: fallbackReason,
      latencyMs: hooks.now() - started,
      ...summarizeQaSummaryCatch(error),
    });
    queueMetrics.failed += 1;
    queueMetrics.lastLatencyMs = hooks.now() - started;
  } finally {
    clearEphemeralAccess(job);
    running -= 1;
    pump();
  }
}

function pump(): void {
  const config = hooks.config();
  while (running < config.concurrency && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    running += 1;
    hooks.schedule(() => void processJob(job));
  }
}

export function getQaSummaryRuntime(sessionId: string): QaSummaryRuntimeV2DTO {
  return toRuntime(sessionId);
}

export async function getQaSummaryRuntimeFresh(
  sessionId: string,
  locale: AppLocale,
  access: HostTokenContext,
): Promise<QaSummaryRuntimeV2DTO> {
  const runtime = toRuntime(sessionId);
  if (!runtime.result || runtime.result.status === 'pending') return runtime;

  const prepared = await hooks.prepare({ sessionId, locale, access });
  if (prepared.request.promptContext.snapshotHash === runtime.result.snapshotHash) return runtime;

  const now = hooks.now();
  const current = states.get(sessionId);
  if (!current || current.inflight) return toRuntime(sessionId);
  const result = bindExtractiveResult(prepared, 'source_changed', new Date(now).toISOString());
  states.set(sessionId, {
    ...current,
    result,
    lastFinishedAt: now,
    expiresAt: now + hooks.config().ttlMs,
  });
  return toRuntime(sessionId);
}

export async function getQaSummaryContextPreview(
  sessionId: string,
  locale: AppLocale,
  access: HostTokenContext,
): Promise<QaSummaryContextPreviewDTO> {
  return (await hooks.prepare({ sessionId, locale, access })).preview;
}

export function getQaSummaryQueueMetrics() {
  return { queueLength: queue.length, running, ...queueMetrics };
}

export async function requestQaSummary(
  sessionId: string,
  locale: AppLocale,
  access: HostTokenContext,
): Promise<QaSummaryRuntimeV2DTO> {
  const config = hooks.config();
  pruneExpired(sessionId, hooks.now());
  if (!config.enabled) return toRuntime(sessionId);

  if (states.get(sessionId)?.inflight) return toRuntime(sessionId);

  const prepared = await hooks.prepare({ sessionId, locale, access });
  if (isSessionInvalidated(sessionId)) return toRuntime(sessionId);

  // Context preparation is asynchronous. Another request can have queued or even
  // completed a job for this session while this request was waiting, so all
  // state-dependent decisions below must use the current state.
  const current = states.get(sessionId);
  if (current?.inflight) return toRuntime(sessionId);

  const now = hooks.now();
  const snapshotHash = prepared.request.promptContext.snapshotHash;
  if (!hasMinimumSummaryCorpus(prepared)) {
    if (
      current?.result.snapshotHash === snapshotHash &&
      (current.result.status === 'ready' || current.result.status === 'uncertain')
    ) {
      return toRuntime(sessionId);
    }
    const generation = nextGeneration++;
    states.set(sessionId, {
      result: tooFewQuestionsResult(prepared, new Date(now).toISOString()),
      inflight: false,
      lastFinishedAt: now,
      expiresAt: now + config.ttlMs,
      generation,
    });
    return toRuntime(sessionId);
  }

  if (
    current &&
    current.lastFinishedAt !== null &&
    now - current.lastFinishedAt < config.cooldownMs &&
    current.result.snapshotHash === snapshotHash &&
    current.result.status !== 'failed' &&
    !(
      (current.result.execution.effectiveMode === 'extractive' ||
        current.result.execution.effectiveMode === 'rule-based') &&
      current.result.execution.fallback?.retry === 'manual'
    )
  ) {
    queueMetrics.cacheHits += 1;
    return toRuntime(sessionId);
  }

  if (queue.length + running >= config.queueLimit) {
    queueMetrics.queueRejected += 1;
    const generation = nextGeneration++;
    states.set(sessionId, {
      result: bindExtractiveResult(prepared, 'queue_full', new Date(now).toISOString()),
      inflight: false,
      lastFinishedAt: now,
      expiresAt: now + config.ttlMs,
      generation,
    });
    logger.warn('qa_summary:skipped', { reason: 'queue-full' });
    return toRuntime(sessionId);
  }

  const generation = nextGeneration++;
  states.set(sessionId, {
    result: createPendingQaSummaryResultV2(prepared),
    inflight: true,
    lastFinishedAt: current?.lastFinishedAt ?? null,
    expiresAt: now + config.ttlMs,
    generation,
  });
  queue.push({
    sessionId,
    locale,
    generation,
    access: cloneMinimalHostAccess(access),
  });
  pump();
  return toRuntime(sessionId);
}

export function resetQaSummaryQueueForTests(overrides?: Partial<QueueHooks>): void {
  for (const timer of pendingTimers.splice(0)) clearImmediate(timer);
  for (const job of queue.splice(0)) clearEphemeralAccess(job);
  for (const { controller } of activeJobs.values()) {
    controller.abort(new Error('QA_SUMMARY_TEST_RESET'));
  }
  activeJobs.clear();
  running = 0;
  nextGeneration = 1;
  states.clear();
  invalidatedSessions.clear();
  queueMetrics.completed = 0;
  queueMetrics.failed = 0;
  queueMetrics.timeouts = 0;
  queueMetrics.cacheHits = 0;
  queueMetrics.queueRejected = 0;
  queueMetrics.lastLatencyMs = null;
  hooks = { ...createDefaultHooks(), ...overrides };
}

export async function waitForQaSummaryIdleForTests(timeoutMs = 1_000): Promise<void> {
  const started = Date.now();
  while (queue.length > 0 || running > 0 || pendingTimers.length > 0) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Q&A-Summary-Queue wurde nicht leer');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
