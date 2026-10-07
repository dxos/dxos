//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { makeFrameBudget } from './scheduler.browser.ts';

describe('FrameBudget', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('flushBeforePaint lifts the budget until the current task ends', async ({ expect }) => {
    // Spending asks for a frame to reset the budget on; node has none.
    vi.stubGlobal('requestAnimationFrame', () => 0);
    const budget = makeFrameBudget();
    budget.spend(100);
    expect(budget.hasTime()).toBe(false);

    budget.flushBeforePaint();
    expect(budget.hasTime()).toBe(true);
    await Promise.resolve();
    expect(budget.hasTime()).toBe(true);

    await expect.poll(() => budget.hasTime()).toBe(false);
  });
});
