//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import { flushBeforePaint, frameBudget } from './scheduler.browser.ts';

describe('frameBudget', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('flushBeforePaint lifts the budget until the current task ends', async ({ expect }) => {
    // Spending asks for a frame to reset the budget on; node has none.
    vi.stubGlobal('requestAnimationFrame', () => 0);
    frameBudget.spend(100);
    expect(frameBudget.hasTime()).toBe(false);

    flushBeforePaint();
    expect(frameBudget.hasTime()).toBe(true);
    await Promise.resolve();
    expect(frameBudget.hasTime()).toBe(true);

    await expect.poll(() => frameBudget.hasTime()).toBe(false);
  });
});
