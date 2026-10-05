import { z } from 'zod';
import {
  LearningObjectiveDerivationCorrelationSchema,
  LearningObjectiveDerivationInputSchema,
} from './learning-objective-derivation';

/**
 * Opaque one-shot bearer for one explicitly prepared learning-objective derivation.
 * `randomBytes(32).toString('base64url')` is always 43 characters without padding.
 */
export const LearningObjectiveDerivationCapabilitySchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]{43}$/u, 'Ungültige Ableitungs-Capability.');
export type LearningObjectiveDerivationCapability = z.infer<
  typeof LearningObjectiveDerivationCapabilitySchema
>;

/** Correlation values fixed before any model-backed work may start. */
export const PrepareLearningObjectiveDerivationInputSchema =
  LearningObjectiveDerivationCorrelationSchema;
export type PrepareLearningObjectiveDerivationInput = z.infer<
  typeof PrepareLearningObjectiveDerivationInputSchema
>;

export const PrepareLearningObjectiveDerivationOutputSchema =
  PrepareLearningObjectiveDerivationInputSchema.extend({
    capability: LearningObjectiveDerivationCapabilitySchema,
    expiresAt: z.string().datetime({ offset: true }),
  }).strict();
export type PrepareLearningObjectiveDerivationOutput = z.infer<
  typeof PrepareLearningObjectiveDerivationOutputSchema
>;

/**
 * Public transport contract. The capability is authorization for CPU work only;
 * it never grants access to stored quiz or session data.
 */
export const RunLearningObjectiveDerivationInputSchema =
  LearningObjectiveDerivationInputSchema.safeExtend({
    capability: LearningObjectiveDerivationCapabilitySchema,
  }).strict();
export type RunLearningObjectiveDerivationInput = z.infer<
  typeof RunLearningObjectiveDerivationInputSchema
>;
