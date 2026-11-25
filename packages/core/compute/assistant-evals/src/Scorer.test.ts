//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ToolInvocation } from './assertions.ts';
import * as Scorer from './Scorer.ts';

const call = (overrides: Partial<ToolInvocation>): ToolInvocation => ({ name: 'eval', input: '{}', ...overrides });

describe('Scorer.failedCall', () => {
  test('a tool error is a failure', ({ expect }) => {
    expect(Scorer.failedCall(call({ error: 'boom' }))).toBe(true);
  });

  test('any result is a success', ({ expect }) => {
    expect(Scorer.failedCall(call({ result: JSON.stringify('done') }))).toBe(false);
    expect(Scorer.failedCall(call({ result: 'plain text' }))).toBe(false);
    expect(Scorer.failedCall(call({ result: undefined }))).toBe(false);
  });
});

describe('Scorer.withinBudget', () => {
  test('full marks up to the target', ({ expect }) => {
    expect(Scorer.withinBudget(0, 0, 5)).toBe(1);
    expect(Scorer.withinBudget(3, 3, 15)).toBe(1);
  });

  test('falls linearly to nothing at the budget', ({ expect }) => {
    expect(Scorer.withinBudget(9, 3, 15)).toBe(0.5);
    expect(Scorer.withinBudget(2, 0, 5)).toBeCloseTo(0.6);
    expect(Scorer.withinBudget(15, 3, 15)).toBe(0);
  });
});
