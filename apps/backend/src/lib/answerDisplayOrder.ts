import { stableShuffleWithContext } from '@arsnova/shared-types';

const PARTICIPANT_CHOICE_SHUFFLE_TYPES = new Set(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SURVEY']);

/**
 * Reihenfolge der Wahloptionen für eine teilnehmende Person.
 * Host und Präsentation nutzen die Autorenreihenfolge und rufen das nicht auf.
 * `shuffleAnswerOptions === false` unterdrückt die persönliche Mischung.
 */
export function orderChoiceAnswersForParticipant<T>(
  answers: readonly T[],
  question: { id: string; type: string; shuffleAnswerOptions?: boolean | null },
  seed: string,
): T[] {
  if (
    !PARTICIPANT_CHOICE_SHUFFLE_TYPES.has(question.type) ||
    question.shuffleAnswerOptions === false ||
    answers.length <= 1
  ) {
    return [...answers];
  }
  return stableShuffleWithContext([...answers], seed, question.id);
}
