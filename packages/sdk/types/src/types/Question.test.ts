//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import * as Question from './Question.ts';

describe('Question', () => {
  test('is unanswered until it carries an answer', ({ expect }) => {
    const question = Question.make({ text: 'What is our refund window?' });

    expect(Question.isAnswered(question)).toBe(false);
    expect(Question.answer(question, '30 days')).toBe(true);
    expect(Question.isAnswered(question)).toBe(true);
    expect(question.selectedAnswer).toBe('30 days');
    expect(question.answered).toBeDefined();
  });

  test('stamps `asked` when the caller does not', ({ expect }) => {
    const question = Question.make({ text: 'Which one?' });

    expect(Number.isNaN(Date.parse(question.asked))).toBe(false);
  });

  test('refuses a blank answer rather than marking the question answered', ({ expect }) => {
    const question = Question.make({ text: 'Which one?' });

    expect(Question.answer(question, '   ')).toBe(false);
    expect(Question.isAnswered(question)).toBe(false);
    expect(question.answered).toBeUndefined();
  });

  test('trims an answer, so whitespace cannot pass as a decision', ({ expect }) => {
    const question = Question.make({ text: 'Which one?' });

    Question.answer(question, '  60 days \n');
    expect(question.selectedAnswer).toBe('60 days');
  });
});
