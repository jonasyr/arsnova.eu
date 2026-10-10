import { describe, expect, it } from 'vitest';
import { orderChoiceAnswersForParticipant } from './answerDisplayOrder';

describe('orderChoiceAnswersForParticipant', () => {
  const answers = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
    { id: 'd', text: 'D' },
    { id: 'e', text: 'E' },
  ];

  it('behält die Autorenreihenfolge, wenn die Mischung aus ist', () => {
    expect(
      orderChoiceAnswersForParticipant(
        answers,
        { id: 'q1', type: 'SINGLE_CHOICE', shuffleAnswerOptions: false },
        'seed-a',
      ),
    ).toEqual(answers);
  });

  it('mischt Wahloptionen stabil pro Seed und unterschiedlich zwischen Personen', () => {
    const first = orderChoiceAnswersForParticipant(
      answers,
      { id: 'q1', type: 'MULTIPLE_CHOICE', shuffleAnswerOptions: true },
      'participant-1',
    );
    const firstAgain = orderChoiceAnswersForParticipant(
      answers,
      { id: 'q1', type: 'MULTIPLE_CHOICE' },
      'participant-1',
    );
    const second = orderChoiceAnswersForParticipant(
      answers,
      { id: 'q1', type: 'SURVEY', shuffleAnswerOptions: true },
      'participant-2',
    );

    expect(firstAgain).toEqual(first);
    expect(first.map((answer) => answer.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(second.map((answer) => answer.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(second).not.toEqual(first);
  });

  it('lässt andere Fragentypen und einzelne Optionen unverändert', () => {
    expect(
      orderChoiceAnswersForParticipant(
        answers,
        { id: 'q1', type: 'SHORT_TEXT', shuffleAnswerOptions: true },
        'seed',
      ),
    ).toEqual(answers);
    expect(
      orderChoiceAnswersForParticipant(
        [answers[0]!],
        { id: 'q1', type: 'SINGLE_CHOICE', shuffleAnswerOptions: true },
        'seed',
      ),
    ).toEqual([answers[0]]);
  });
});
