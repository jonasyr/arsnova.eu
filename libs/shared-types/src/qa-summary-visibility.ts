export const QA_SUMMARY_MIN_VISIBLE_QUESTIONS = 3;

const QA_SUMMARY_VISIBLE_QUESTION_STATUSES = new Set(['PENDING', 'ACTIVE', 'PINNED']);
const QA_SUMMARY_KEEPABLE_RESULT_STATUSES = new Set(['pending', 'ready']);

export function isQaSummaryVisibleQuestionStatus(status: string): boolean {
  return QA_SUMMARY_VISIBLE_QUESTION_STATUSES.has(status);
}

export function countQaSummaryVisibleQuestions(
  questions: readonly { readonly status: string }[],
): number {
  let count = 0;
  for (const question of questions) {
    if (isQaSummaryVisibleQuestionStatus(question.status)) {
      count += 1;
    }
  }
  return count;
}

export function isQaSummaryKeepableResultStatus(status: string | null | undefined): boolean {
  return status !== null && status !== undefined && QA_SUMMARY_KEEPABLE_RESULT_STATUSES.has(status);
}

export function shouldShowQaSummaryCard(input: {
  readonly enabled: boolean;
  readonly inferenceConfigured: boolean;
  /** V2 can always provide the local, evidence-bound extractive fallback. */
  readonly fallbackAvailable?: boolean;
  readonly visibleQuestionCount: number;
  readonly resultStatus?: string | null;
}): boolean {
  if (!input.enabled || (!input.inferenceConfigured && input.fallbackAvailable !== true)) {
    return false;
  }
  if (isQaSummaryKeepableResultStatus(input.resultStatus)) {
    return true;
  }
  return input.visibleQuestionCount >= QA_SUMMARY_MIN_VISIBLE_QUESTIONS;
}

export function canRequestQaSummary(input: {
  readonly enabled: boolean;
  readonly inferenceConfigured: boolean;
  /** V2 can always provide the local, evidence-bound extractive fallback. */
  readonly fallbackAvailable?: boolean;
  readonly visibleQuestionCount: number;
}): boolean {
  return (
    input.enabled &&
    (input.inferenceConfigured || input.fallbackAvailable === true) &&
    input.visibleQuestionCount >= QA_SUMMARY_MIN_VISIBLE_QUESTIONS
  );
}
