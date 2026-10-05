import {
  QaSummaryModelOutputV2Schema,
  type AppLocale,
  type ModerationPromptContextV1,
  type ModerationPromptSource,
  type QaSummaryModelOutputV2,
} from '@arsnova/shared-types';

type LocaleCopy = Readonly<{
  statement: (label: string) => string;
  empty: string;
  limitation: string;
}>;

const COPY: Readonly<Record<AppLocale, LocaleCopy>> = {
  de: {
    statement: (label) => `Hervorgehobener Beleg: »${label}«`,
    empty: 'Für eine extraktive Kurzfassung sind noch keine Textbelege ausgewählt.',
    limitation: 'Extraktive Kurzfassung ohne generative Interpretation.',
  },
  en: {
    statement: (label) => `Highlighted evidence: “${label}”`,
    empty: 'No textual evidence has been selected for an extractive summary yet.',
    limitation: 'Extractive summary without generative interpretation.',
  },
  fr: {
    statement: (label) => `Élément mis en évidence : « ${label} »`,
    empty: 'Aucun élément textuel n’est encore sélectionné pour un résumé extractif.',
    limitation: 'Résumé extractif sans interprétation générative.',
  },
  es: {
    statement: (label) => `Evidencia destacada: «${label}»`,
    empty: 'Aún no se han seleccionado evidencias textuales para un resumen extractivo.',
    limitation: 'Resumen extractivo sin interpretación generativa.',
  },
  it: {
    statement: (label) => `Evidenza in primo piano: «${label}»`,
    empty: 'Non sono ancora state selezionate evidenze testuali per un riepilogo estrattivo.',
    limitation: 'Riepilogo estrattivo senza interpretazione generativa.',
  },
};

function truncateCodePoints(text: string, maxLength: number, collapseWhitespace = true): string {
  const normalized = collapseWhitespace ? text.trim().replace(/\s+/g, ' ') : text.trim();
  const points = [...normalized];
  if (points.length <= maxLength) return points.join('');
  return `${points
    .slice(0, Math.max(0, maxLength - 1))
    .join('')
    .trimEnd()}…`;
}

function extractiveLabel(source: ModerationPromptSource): string | null {
  switch (source.kind) {
    case 'qa-question':
      return source.content.state === 'included' ? source.content.text : null;
    case 'quiz-question':
    case 'learning-objective':
      return source.text;
    case 'semantic-topic':
    case 'quiz-result-aggregate':
    case 'feedback-aggregate':
    case 'compass-signal':
      return source.label;
  }
}

function sourcePriority(source: ModerationPromptSource): number {
  switch (source.kind) {
    case 'semantic-topic':
      return 0;
    case 'qa-question':
      return 1;
    case 'compass-signal':
      return 2;
    case 'learning-objective':
      return 3;
    case 'quiz-result-aggregate':
    case 'feedback-aggregate':
      return 4;
    case 'quiz-question':
      return 5;
  }
}

/**
 * Production fallback: deterministic evidence excerpts only. It deliberately
 * does not invent topic membership, causes, learning states or recommendations.
 */
export function createExtractiveQaSummaryOutput(
  promptContext: ModerationPromptContextV1,
): QaSummaryModelOutputV2 {
  const locale = promptContext.context.locale;
  const copy = COPY[locale];
  const candidates = promptContext.context.sources
    .map((source) => ({ source, label: extractiveLabel(source) }))
    .filter(
      (candidate): candidate is { source: ModerationPromptSource; label: string } =>
        candidate.label !== null && candidate.label.trim().length > 0,
    )
    .sort(
      (left, right) =>
        sourcePriority(left.source) - sourcePriority(right.source) ||
        left.source.id.localeCompare(right.source.id),
    )
    .slice(0, 4);

  if (candidates.length === 0) {
    return QaSummaryModelOutputV2Schema.parse({
      status: 'uncertain',
      statements: [],
      suggestedNextSteps: [],
      limitations: [copy.empty, copy.limitation],
      modelVersion: 'extractive-v2',
    });
  }

  return QaSummaryModelOutputV2Schema.parse({
    status: 'ready',
    statements: candidates.map(({ source, label }) => ({
      text: truncateCodePoints(copy.statement(truncateCodePoints(label, 320)), 400, false),
      sourceIds: [source.id],
    })),
    suggestedNextSteps: [],
    limitations: [copy.limitation],
    modelVersion: 'extractive-v2',
  });
}
