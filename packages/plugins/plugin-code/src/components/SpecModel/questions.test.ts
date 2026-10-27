//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import FEEDS_MDL from '../../../../../core/echo/echo/docs/FEEDS.mdl?raw';
import { parseQuestions, toQuestionThread } from './questions.ts';

const fence = (body: string) => ['```mdl', body, '```'].join('\n');

const SPEC = [
  fence(
    [
      'question Q-1: Is merge a concept of the feed layer: yes or no?',
      '  to: user:alice',
      '  status: answered',
      '  answer: |',
      '    The core does nothing with a merge [D-3].',
      '    Merges are out of scope.',
      '  decisions: [D-3, D-50]  # see the review',
    ].join('\n'),
  ),
  fence(
    ['question Q-2: Which place does a walk give?', '  status: moot  # out of scope', '  note: Out of scope.'].join(
      '\n',
    ),
  ),
  fence(
    [
      'question Q-3: Does a walk give the first block or the latest block?',
      '  to: user:bob',
      '  status: open',
      '  affects: [F-1.3]',
      '  options:',
      '    - At its first block, as before.',
      '    - At its latest block.',
    ].join('\n'),
  ),
  fence(['question Q-4: No status.', '  to: user:bob'].join('\n')),
].join('\n\n');

describe('questions', () => {
  test('parses every question with a status, open first', ({ expect }) => {
    const questions = parseQuestions(SPEC);
    expect(questions.map(({ id, status }) => [id, status])).toEqual([
      ['Q-3', 'open'],
      ['Q-1', 'answered'],
      ['Q-2', 'moot'],
    ]);
    expect(questions[0]).toEqual({
      id: 'Q-3',
      text: 'Does a walk give the first block or the latest block?',
      status: 'open',
      to: 'user:bob',
      decisions: [],
      affects: ['F-1.3'],
      options: ['At its first block, as before.', 'At its latest block.'],
    });
    expect(questions[1]).toMatchObject({
      text: 'Is merge a concept of the feed layer: yes or no?',
      answer: 'The core does nothing with a merge [D-3]. Merges are out of scope.',
      decisions: ['D-3', 'D-50'],
    });
    expect(questions[2].note).toBe('Out of scope.');
  });

  test('maps a question to a task question thread', ({ expect }) => {
    const [open, answered, moot] = parseQuestions(SPEC);
    const openThread = toQuestionThread(open);
    expect(openThread.answer).toBeUndefined();
    expect(openThread.question.options).toEqual([
      { title: 'At its first block, as before.' },
      { title: 'At its latest block.' },
    ]);

    const answeredThread = toQuestionThread(answered);
    expect(answeredThread.answer?.answer).toBe(answered.answer);
    expect(answeredThread.answer?.questionId).toBe(answeredThread.question.id);
    // Stable across renders, so React keeps the same card.
    expect(toQuestionThread(answered).question.id).toBe(answeredThread.question.id);

    expect(toQuestionThread(moot).question.context).toBe('Out of scope.');
  });

  test('the feeds spec', ({ expect }) => {
    const questions = parseQuestions(FEEDS_MDL);
    // The spec keeps changing, so only what its first questions settled is checked.
    expect(questions.map(({ id }) => id)).toEqual(expect.arrayContaining(['Q-1', 'Q-2', 'Q-3', 'Q-4']));
    expect(questions.find(({ id }) => id === 'Q-2')?.decisions).toEqual(['D-51']);
    const statuses = questions.map(({ status }) => status);
    const firstSettled = statuses.findIndex((status) => status !== 'open');
    expect(firstSettled === -1 ? [] : statuses.slice(firstSettled)).not.toContain('open');
  });
});
