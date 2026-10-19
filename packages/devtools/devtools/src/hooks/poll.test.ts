//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { Context } from '@dxos/context';

import { pollWithBackoff } from './poll.ts';

describe('pollWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('doubles the delay up to the cap, and stops when the poll returns false', async ({ expect }) => {
    const ctx = new Context();
    const start = Date.now();
    const runs: number[] = [];
    pollWithBackoff(
      ctx,
      async () => {
        runs.push(Date.now() - start);
        return runs.length < 6;
      },
      { initialDelay: 1_000, maxDelay: 4_000 },
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(runs).toEqual([0, 1_000, 3_000, 7_000, 11_000, 15_000]);
    await ctx.dispose();
  });

  test('stops when the context is disposed', async ({ expect }) => {
    const ctx = new Context();
    let runs = 0;
    pollWithBackoff(ctx, async () => void runs++, { initialDelay: 1_000, maxDelay: 1_000 });
    await vi.advanceTimersByTimeAsync(2_500);
    await ctx.dispose();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(runs).toBe(3);
  });
});
