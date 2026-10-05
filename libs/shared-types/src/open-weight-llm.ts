import { z } from 'zod';
import {
  QUIZ_UPLOAD_MAX_OPTIONS_PER_QUESTION,
  QaSummaryInferenceRequestSchema,
  QaSummaryLocaleEnum,
  QaSummaryModelOutputSchema,
} from './schemas';
import {
  LEARNING_OBJECTIVE_MAX_OBJECTIVES,
  LEARNING_OBJECTIVE_MAX_REFERENCES,
  LEARNING_OBJECTIVE_TEXT_MAX_LENGTH,
  QuizSourceQuestionIdSchema,
} from './learning-objectives';
import { QUIZ_QUESTION_TEXT_MAX_LENGTH, QUIZ_UPLOAD_MAX_QUESTIONS } from './quiz-contract-limits';

/**
 * Versioned application boundary for the private llama.cpp runtime (Story 8.9d).
 *
 * These schemas deliberately describe application jobs, not the OpenAI-compatible
 * wire format exposed by llama-server. The backend translator is the only place
 * where the two contracts meet.
 */
export const OPEN_WEIGHT_LLM_SCHEMA_VERSION = 1 as const;
/**
 * Upper bound for the complete UTF-8 JSON user message sent to llama.cpp.
 * Together with the fixed system/chat overhead and the largest 768-token
 * completion budget, 2,500 worst-case byte-fallback tokens stay below the
 * runtime's fixed 4,096-token context. Consumers must batch larger inputs.
 */
export const OPEN_WEIGHT_LLM_MAX_REQUEST_BYTES = 2_500;
export const OPEN_WEIGHT_LLM_TASK_TYPES = [
  'topic_label',
  'qa_summary',
  'learning_objectives',
] as const;
export const OpenWeightLlmTaskTypeSchema = z.enum(OPEN_WEIGHT_LLM_TASK_TYPES);
export type OpenWeightLlmTaskType = z.infer<typeof OpenWeightLlmTaskTypeSchema>;

const OpenWeightLlmSchemaVersionField = z.literal(OPEN_WEIGHT_LLM_SCHEMA_VERSION);
const RuntimeSourceIdSchema = z.string().trim().min(1).max(80);
const RuntimeSourceTextSchema = z.string().trim().min(1).max(500);

function enforceRuntimeRequestByteLimit(value: unknown, ctx: z.RefinementCtx): void {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes > OPEN_WEIGHT_LLM_MAX_REQUEST_BYTES) {
    ctx.addIssue({
      code: 'custom',
      message: `Open-Weight-LLM-Auftrag darf maximal ${OPEN_WEIGHT_LLM_MAX_REQUEST_BYTES} UTF-8-Bytes groß sein; größere Eingaben müssen deterministisch aufgeteilt werden.`,
    });
  }
}

export const OpenWeightLlmTopicLabelRequestSchema = z
  .object({
    schemaVersion: OpenWeightLlmSchemaVersionField,
    taskType: z.literal('topic_label'),
    locale: QaSummaryLocaleEnum,
    clusterId: z.string().trim().min(1).max(80),
    sources: z
      .array(
        z
          .object({
            id: RuntimeSourceIdSchema,
            text: RuntimeSourceTextSchema,
          })
          .strict(),
      )
      .min(1)
      .max(40),
  })
  .strict()
  .superRefine(enforceRuntimeRequestByteLimit);
export type OpenWeightLlmTopicLabelRequest = z.infer<typeof OpenWeightLlmTopicLabelRequestSchema>;

export const OpenWeightLlmSummaryRequestSchema = QaSummaryInferenceRequestSchema.extend({
  schemaVersion: OpenWeightLlmSchemaVersionField,
  taskType: z.literal('qa_summary'),
})
  .strict()
  .superRefine(enforceRuntimeRequestByteLimit);
export type OpenWeightLlmSummaryRequest = z.infer<typeof OpenWeightLlmSummaryRequestSchema>;

export const OpenWeightLlmLearningQuestionSchema = z
  .object({
    id: QuizSourceQuestionIdSchema,
    text: z.string().trim().min(1).max(QUIZ_QUESTION_TEXT_MAX_LENGTH),
    answerOptions: z
      .array(
        z
          .object({
            text: z.string().trim().min(1).max(500),
            isCorrect: z.boolean(),
          })
          .strict(),
      )
      .max(QUIZ_UPLOAD_MAX_OPTIONS_PER_QUESTION),
    solutionExplanation: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict();
export type OpenWeightLlmLearningQuestion = z.infer<typeof OpenWeightLlmLearningQuestionSchema>;

export const OpenWeightLlmLearningObjectivesRequestSchema = z
  .object({
    schemaVersion: OpenWeightLlmSchemaVersionField,
    taskType: z.literal('learning_objectives'),
    locale: QaSummaryLocaleEnum,
    requestId: z.uuid(),
    questions: z.array(OpenWeightLlmLearningQuestionSchema).min(1).max(QUIZ_UPLOAD_MAX_QUESTIONS),
  })
  .strict()
  .superRefine(enforceRuntimeRequestByteLimit);
export type OpenWeightLlmLearningObjectivesRequest = z.infer<
  typeof OpenWeightLlmLearningObjectivesRequestSchema
>;

export const OpenWeightLlmRequestSchema = z.union([
  OpenWeightLlmTopicLabelRequestSchema,
  OpenWeightLlmSummaryRequestSchema,
  OpenWeightLlmLearningObjectivesRequestSchema,
]);
export type OpenWeightLlmRequest = z.infer<typeof OpenWeightLlmRequestSchema>;

export const OpenWeightLlmTopicLabelOutputSchema = z
  .object({
    schemaVersion: OpenWeightLlmSchemaVersionField,
    taskType: z.literal('topic_label'),
    label: z.string().trim().min(1).max(120),
    sourceIds: z.array(RuntimeSourceIdSchema).min(1).max(8),
  })
  .strict();
export type OpenWeightLlmTopicLabelOutput = z.infer<typeof OpenWeightLlmTopicLabelOutputSchema>;

export const OpenWeightLlmSummaryOutputSchema = z
  .object({
    schemaVersion: OpenWeightLlmSchemaVersionField,
    taskType: z.literal('qa_summary'),
    result: QaSummaryModelOutputSchema.strict(),
  })
  .strict();
export type OpenWeightLlmSummaryOutput = z.infer<typeof OpenWeightLlmSummaryOutputSchema>;

export const OpenWeightLlmLearningObjectiveSuggestionSchema = z
  .object({
    text: z.string().trim().min(1).max(LEARNING_OBJECTIVE_TEXT_MAX_LENGTH),
    questionIds: z.array(QuizSourceQuestionIdSchema).min(1).max(LEARNING_OBJECTIVE_MAX_REFERENCES),
  })
  .strict();
export type OpenWeightLlmLearningObjectiveSuggestion = z.infer<
  typeof OpenWeightLlmLearningObjectiveSuggestionSchema
>;

export const OpenWeightLlmLearningObjectivesOutputSchema = z
  .object({
    schemaVersion: OpenWeightLlmSchemaVersionField,
    taskType: z.literal('learning_objectives'),
    objectives: z
      .array(OpenWeightLlmLearningObjectiveSuggestionSchema)
      .max(LEARNING_OBJECTIVE_MAX_OBJECTIVES),
    limitations: z.array(z.string().trim().min(1).max(280)).max(6),
  })
  .strict();
export type OpenWeightLlmLearningObjectivesOutput = z.infer<
  typeof OpenWeightLlmLearningObjectivesOutputSchema
>;

export const OpenWeightLlmOutputSchema = z.discriminatedUnion('taskType', [
  OpenWeightLlmTopicLabelOutputSchema,
  OpenWeightLlmSummaryOutputSchema,
  OpenWeightLlmLearningObjectivesOutputSchema,
]);
export type OpenWeightLlmOutput = z.infer<typeof OpenWeightLlmOutputSchema>;

export const OPEN_WEIGHT_LLM_RESULT_FAILURE_STATUSES = [
  'disabled',
  'busy',
  'aborted',
  'timeout',
  'unavailable',
  'invalid_response',
  'misconfigured',
  'circuit_open',
] as const;
export const OpenWeightLlmResultFailureStatusSchema = z.enum(
  OPEN_WEIGHT_LLM_RESULT_FAILURE_STATUSES,
);
export type OpenWeightLlmResultFailureStatus = z.infer<
  typeof OpenWeightLlmResultFailureStatusSchema
>;

export const OpenWeightLlmBusyResultSchema = z
  .object({
    status: z.literal('busy'),
    retry: z.literal('manual'),
  })
  .strict();
export type OpenWeightLlmBusyResult = z.infer<typeof OpenWeightLlmBusyResultSchema>;

export function openWeightLlmOutputSchemaFor(
  taskType: 'topic_label',
): typeof OpenWeightLlmTopicLabelOutputSchema;
export function openWeightLlmOutputSchemaFor(
  taskType: 'qa_summary',
): typeof OpenWeightLlmSummaryOutputSchema;
export function openWeightLlmOutputSchemaFor(
  taskType: 'learning_objectives',
): typeof OpenWeightLlmLearningObjectivesOutputSchema;
export function openWeightLlmOutputSchemaFor(taskType: OpenWeightLlmTaskType) {
  switch (taskType) {
    case 'topic_label':
      return OpenWeightLlmTopicLabelOutputSchema;
    case 'qa_summary':
      return OpenWeightLlmSummaryOutputSchema;
    case 'learning_objectives':
      return OpenWeightLlmLearningObjectivesOutputSchema;
  }
}

/** Dynamic reference integrity cannot be expressed by the static response schema. */
export function hasOnlyAllowedOpenWeightLlmReferences(
  request: OpenWeightLlmRequest,
  output: OpenWeightLlmOutput,
): boolean {
  if (request.taskType !== output.taskType) {
    return false;
  }
  switch (request.taskType) {
    case 'topic_label': {
      if (output.taskType !== 'topic_label') return false;
      const allowed = new Set(request.sources.map((source) => source.id));
      return output.sourceIds.every((sourceId) => allowed.has(sourceId));
    }
    case 'qa_summary': {
      if (output.taskType !== 'qa_summary') return false;
      const allowed = new Set(request.sources.map((source) => source.id));
      return [...output.result.statements, ...output.result.suggestedNextSteps].every((statement) =>
        statement.sourceIds.every((sourceId) => allowed.has(sourceId)),
      );
    }
    case 'learning_objectives': {
      if (output.taskType !== 'learning_objectives') return false;
      const allowed = new Set(request.questions.map((question) => question.id));
      return output.objectives.every((objective) =>
        objective.questionIds.every((questionId) => allowed.has(questionId)),
      );
    }
  }
}
