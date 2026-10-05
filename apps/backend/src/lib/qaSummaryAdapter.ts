import {
  QaSummaryInferenceRequestSchema,
  QaSummaryModelOutputSchema,
  type QaSummaryInferenceRequest,
  type QaSummaryModelOutput,
} from '@arsnova/shared-types';
import {
  isBlockedQaSummaryInferenceHost,
  resolveQaSummaryConfig,
  type QaSummaryConfig,
} from './qaSummaryConfig';
import type { QaSummaryAnalysisSnapshot } from './qaSummarySnapshot';

export const QA_SUMMARY_MAX_RESPONSE_BYTES = 65_536;

export type QaSummaryFetch = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

type AdapterHooks = {
  fetch: QaSummaryFetch;
  config: () => QaSummaryConfig;
};

function createDefaultHooks(): AdapterHooks {
  return {
    fetch: globalThis.fetch as QaSummaryFetch,
    config: () => resolveQaSummaryConfig(),
  };
}

let hooks: AdapterHooks = createDefaultHooks();

export function resetQaSummaryAdapterForTests(overrides?: Partial<AdapterHooks>): void {
  hooks = {
    ...createDefaultHooks(),
    ...overrides,
  };
}

function unconfiguredOutput(modelVersion: string, limitation: string): QaSummaryModelOutput {
  return {
    status: 'failed',
    statements: [],
    suggestedNextSteps: [],
    limitations: [limitation],
    modelVersion,
  };
}

function isAbortOrTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function failedOutputFromCaughtError(error: unknown): QaSummaryModelOutput {
  if (isAbortOrTimeout(error)) {
    return unconfiguredOutput('stub:timeout', 'Die Zusammenfassung hat zu lange gedauert.');
  }
  return unconfiguredOutput('stub:error', 'Die Zusammenfassung ist gerade nicht verfügbar.');
}

export async function runQaSummaryInference(
  snapshot: QaSummaryAnalysisSnapshot,
  snapshotHash: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<QaSummaryModelOutput> {
  try {
    const request = QaSummaryInferenceRequestSchema.parse({
      locale: snapshot.locale,
      snapshotHash,
      sources: snapshot.sources.map((source) => ({
        id: source.id,
        kind: source.kind,
        text: source.text,
      })),
    });
    return await runQaSummaryLegacyRequestUnchecked(request, options);
  } catch (error) {
    return failedOutputFromCaughtError(error);
  }
}

export async function runQaSummaryLegacyRequest(
  rawRequest: QaSummaryInferenceRequest,
  options: { readonly signal?: AbortSignal } = {},
): Promise<QaSummaryModelOutput> {
  try {
    const request = QaSummaryInferenceRequestSchema.parse(rawRequest);
    return await runQaSummaryLegacyRequestUnchecked(request, options);
  } catch (error) {
    return failedOutputFromCaughtError(error);
  }
}

async function runQaSummaryLegacyRequestUnchecked(
  request: QaSummaryInferenceRequest,
  options: { readonly signal?: AbortSignal },
): Promise<QaSummaryModelOutput> {
  const config = hooks.config();
  if (!config.inferenceUrl) {
    return unconfiguredOutput('stub:unconfigured', 'Kein privater Inferenzserver konfiguriert.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.inferenceUrl);
  } catch {
    return unconfiguredOutput('stub:unconfigured', 'Kein privater Inferenzserver konfiguriert.');
  }
  if (isBlockedQaSummaryInferenceHost(parsedUrl.hostname)) {
    return unconfiguredOutput(
      'stub:saas-blocked',
      'Öffentliche SaaS-LLM-Endpunkte sind nicht zulässig.',
    );
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (config.inferenceToken) {
    headers.authorization = `Bearer ${config.inferenceToken}`;
  }

  const timeoutSignal = AbortSignal.timeout(config.timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  let response: Awaited<ReturnType<QaSummaryFetch>>;
  try {
    response = await hooks.fetch(config.inferenceUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    return failedOutputFromCaughtError(error);
  }

  if (!response.ok) {
    return unconfiguredOutput('stub:error', 'Die Zusammenfassung ist gerade nicht verfügbar.');
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    return failedOutputFromCaughtError(error);
  }
  if (text.length > QA_SUMMARY_MAX_RESPONSE_BYTES) {
    return unconfiguredOutput('stub:invalid-output', 'Die Modellantwort war zu groß.');
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return unconfiguredOutput('stub:invalid-output', 'Die Modellantwort war ungültig.');
  }

  const parsed = QaSummaryModelOutputSchema.safeParse(json);
  if (!parsed.success) {
    return unconfiguredOutput('stub:invalid-output', 'Die Modellantwort war ungültig.');
  }
  return parsed.data;
}
