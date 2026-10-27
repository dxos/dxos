//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toTasks, toTitle } from './extraction.ts';

const answer = (value: string | null, confidence: number) => ({ value, confidence });

describe('toTasks', () => {
  test('keeps the first request even at low confidence, and later ones only when clear-cut', ({ expect }) => {
    const tasks = toTasks({
      task_1: answer('reply today confirming we are renewing at 40 seats', 0.27),
      task_2: answer('get the paperwork signed', 0.39),
      task_3: answer('send me your edits', 0.89),
      due: { value: '2026-10-27' },
    });
    expect(tasks).toEqual([
      { title: 'Reply today confirming we are renewing at 40 seats', due: '2026-10-27' },
      { title: 'Send me your edits' },
    ]);
  });

  test('drops empty slots and repeats', ({ expect }) => {
    const tasks = toTasks({
      task_1: answer('approve the invoice.', 0.8),
      task_2: answer('Approve the invoice', 0.9),
      task_3: answer(null, 0.9),
      due: { value: null },
    });
    expect(tasks).toEqual([{ title: 'Approve the invoice' }]);
  });
});

describe('toTitle', () => {
  test('capitalizes and trims trailing punctuation', ({ expect }) => {
    expect(toTitle('  book a call next week?! ')).toBe('Book a call next week');
  });
});
