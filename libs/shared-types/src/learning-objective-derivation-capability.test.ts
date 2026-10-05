import { describe, expect, it } from 'vitest';
import {
  LearningObjectiveDerivationCapabilitySchema,
  PrepareLearningObjectiveDerivationInputSchema,
  PrepareLearningObjectiveDerivationOutputSchema,
  RunLearningObjectiveDerivationInputSchema,
} from './learning-objective-derivation-capability';

const correlation = {
  schemaVersion: 1 as const,
  operationId: '11111111-1111-4111-8111-111111111111',
  quizId: '22222222-2222-4222-8222-222222222222',
  expectedBundleRevision: 3,
};

describe('learning-objective derivation capability contracts', () => {
  it('accepts exactly a 32-byte base64url bearer', () => {
    expect(LearningObjectiveDerivationCapabilitySchema.safeParse('a'.repeat(43)).success).toBe(
      true,
    );
    expect(LearningObjectiveDerivationCapabilitySchema.safeParse('a'.repeat(42)).success).toBe(
      false,
    );
    expect(
      LearningObjectiveDerivationCapabilitySchema.safeParse(`${'a'.repeat(42)}=`).success,
    ).toBe(false);
  });

  it('keeps prepare correlation strict and echoes every bound field', () => {
    expect(PrepareLearningObjectiveDerivationInputSchema.parse(correlation)).toEqual(correlation);
    expect(
      PrepareLearningObjectiveDerivationInputSchema.safeParse({
        ...correlation,
        untrusted: true,
      }).success,
    ).toBe(false);
    expect(
      PrepareLearningObjectiveDerivationOutputSchema.parse({
        ...correlation,
        capability: 'b'.repeat(43),
        expiresAt: '2026-10-05T10:05:00.000Z',
      }),
    ).toMatchObject(correlation);
  });

  it('extends the versioned core request without weakening its validation', () => {
    const request = {
      ...correlation,
      capability: 'c'.repeat(43),
      locale: 'de' as const,
      maximumDrafts: 4,
      questions: [
        {
          sourceQuestionId: '33333333-3333-4333-8333-333333333333',
          enabled: true,
          text: 'Was ist 2 + 2?',
          type: 'SINGLE_CHOICE' as const,
          difficulty: 'EASY' as const,
          order: 0,
          answers: [
            { text: '3', isCorrect: false },
            { text: '4', isCorrect: true },
          ],
        },
      ],
    };

    expect(RunLearningObjectiveDerivationInputSchema.parse(request)).toEqual(request);
    expect(
      RunLearningObjectiveDerivationInputSchema.safeParse({ ...request, capability: 'short' })
        .success,
    ).toBe(false);
  });
});
