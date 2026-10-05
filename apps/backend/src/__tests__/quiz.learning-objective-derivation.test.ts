import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trpcDodIt } from './test-utils/trpc-dod-evidence';

const { rateLimitMocks, capabilityMocks, deriveLearningObjectiveDraftsMock } = vi.hoisted(() => ({
  rateLimitMocks: {
    prepare: vi.fn(),
    uploadAttempt: vi.fn(),
    uploadStorage: vi.fn(),
  },
  capabilityMocks: {
    issue: vi.fn(),
    reserve: vi.fn(),
    finalize: vi.fn(),
  },
  deriveLearningObjectiveDraftsMock: vi.fn(),
}));

vi.mock('../db', () => ({ prisma: {} }));
vi.mock('@prisma/client', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('../lib/rateLimit', () => ({
  checkLearningObjectiveDerivationPrepareRate: rateLimitMocks.prepare,
  checkQuizUploadAttemptRate: rateLimitMocks.uploadAttempt,
  checkQuizUploadStorageRate: rateLimitMocks.uploadStorage,
}));
vi.mock('../lib/learningObjectiveDerivationCapability', () => ({
  issueLearningObjectiveDerivationCapability: capabilityMocks.issue,
  reserveLearningObjectiveDerivationCapability: capabilityMocks.reserve,
  finalizeLearningObjectiveDerivationCapability: capabilityMocks.finalize,
}));
vi.mock('../lib/learningObjectiveDerivation', () => ({
  deriveLearningObjectiveDrafts: deriveLearningObjectiveDraftsMock,
}));

import { quizRouter } from '../routers/quiz';

const OPERATION_ID = '11111111-1111-4111-8111-111111111111';
const QUIZ_ID = '22222222-2222-4222-8222-222222222222';
const QUESTION_ID = '33333333-3333-4333-8333-333333333333';
const CAPABILITY = 'a'.repeat(43);
const correlation = {
  schemaVersion: 1 as const,
  operationId: OPERATION_ID,
  quizId: QUIZ_ID,
  expectedBundleRevision: 4,
};
const runInput = {
  ...correlation,
  capability: CAPABILITY,
  locale: 'de' as const,
  maximumDrafts: 4,
  questions: [
    {
      sourceQuestionId: QUESTION_ID,
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

function createCaller(signal?: AbortSignal) {
  return quizRouter.createCaller(
    { req: { ip: '203.0.113.7' } as never },
    signal ? { signal } : undefined,
  );
}

describe('quiz learning-objective derivation capability boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMocks.prepare.mockResolvedValue({ allowed: true, remaining: 599 });
    capabilityMocks.issue.mockResolvedValue({
      ...correlation,
      capability: CAPABILITY,
      expiresAt: '2026-10-05T10:05:00.000Z',
    });
    capabilityMocks.reserve.mockResolvedValue(true);
    capabilityMocks.finalize.mockResolvedValue(undefined);
    deriveLearningObjectiveDraftsMock.mockResolvedValue({
      ...correlation,
      status: 'busy',
      retry: 'manual',
    });
  });

  trpcDodIt(
    {
      procedure: 'quiz.prepareLearningObjectiveDerivation',
      case: 'happy',
      mode: 'direct',
      title: 'issues a bound derivation bearer after the shared-NAT rate check',
    },
    async () => {
      const result = await createCaller().prepareLearningObjectiveDerivation(correlation);

      expect(rateLimitMocks.prepare).toHaveBeenCalledWith('203.0.113.7');
      expect(capabilityMocks.issue).toHaveBeenCalledWith(correlation);
      expect(deriveLearningObjectiveDraftsMock).not.toHaveBeenCalled();
      expect(result.capability).toBe(CAPABILITY);
    },
  );

  trpcDodIt(
    {
      procedure: 'quiz.prepareLearningObjectiveDerivation',
      case: 'error',
      mode: 'direct',
      contract: 'TOO_MANY_REQUESTS',
      title: 'rejects derivation preparation when its global budget is exhausted',
    },
    async () => {
      rateLimitMocks.prepare.mockResolvedValue({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 41,
      });

      await expect(
        createCaller().prepareLearningObjectiveDerivation(correlation),
      ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
      expect(capabilityMocks.issue).not.toHaveBeenCalled();
      expect(deriveLearningObjectiveDraftsMock).not.toHaveBeenCalled();
    },
  );

  trpcDodIt(
    {
      procedure: 'quiz.deriveLearningObjectives',
      case: 'error',
      mode: 'direct',
      contract: 'UNAUTHORIZED',
      title: 'rejects missing or replayed derivation authorization before model work',
    },
    async () => {
      capabilityMocks.reserve.mockResolvedValue(false);

      await expect(createCaller().deriveLearningObjectives(runInput)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(deriveLearningObjectiveDraftsMock).not.toHaveBeenCalled();
      expect(capabilityMocks.finalize).not.toHaveBeenCalled();
    },
  );

  trpcDodIt(
    {
      procedure: 'quiz.deriveLearningObjectives',
      case: 'happy',
      mode: 'direct',
      title: 'returns an authorized busy result and finalizes the one-shot capability',
    },
    async () => {
      const controller = new AbortController();
      const result = await createCaller(controller.signal).deriveLearningObjectives(runInput);

      expect(capabilityMocks.reserve).toHaveBeenCalledWith(runInput);
      expect(deriveLearningObjectiveDraftsMock).toHaveBeenCalledWith(
        {
          ...correlation,
          locale: runInput.locale,
          maximumDrafts: runInput.maximumDrafts,
          questions: runInput.questions,
        },
        { signal: controller.signal },
      );
      expect(deriveLearningObjectiveDraftsMock.mock.calls[0]?.[0]).not.toHaveProperty('capability');
      expect(result).toEqual({ ...correlation, status: 'busy', retry: 'manual' });
      expect(capabilityMocks.finalize).toHaveBeenCalledWith(CAPABILITY);
    },
  );

  it('finalizes the reserved bearer even when derivation fails', async () => {
    deriveLearningObjectiveDraftsMock.mockRejectedValue(new Error('runtime failed'));

    await expect(createCaller().deriveLearningObjectives(runInput)).rejects.toThrow(
      'runtime failed',
    );
    expect(capabilityMocks.finalize).toHaveBeenCalledWith(CAPABILITY);
  });

  it('preserves an authorized runtime result when best-effort Redis cleanup fails', async () => {
    capabilityMocks.finalize.mockRejectedValue(new Error('redis unavailable'));

    await expect(createCaller().deriveLearningObjectives(runInput)).resolves.toEqual({
      ...correlation,
      status: 'busy',
      retry: 'manual',
    });
    expect(capabilityMocks.finalize).toHaveBeenCalledWith(CAPABILITY);
  });
});
