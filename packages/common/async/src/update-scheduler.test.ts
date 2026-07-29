//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';

import { sleep } from './timeout';
import { UpdateScheduler } from './update-scheduler';

describe('update-scheduler', () => {
  test('schedules updates', async () => {
    let updates = 0;

    const ctx = new Context();
    const scheduler = new UpdateScheduler(ctx, async () => {
      updates++;
    });

    scheduler.trigger();
    scheduler.trigger();

    await sleep(5);
    expect(updates).to.eq(1);
  });

  // The callback is not reentrant: it typically drains shared queued state, so two passes running at
  // once each claim part of the queue. A throttled `trigger` checks for a running pass *before* its
  // delay, so the check can pass with nothing running and a `runBlocking` can then start a pass while
  // the triggered one sleeps — and both callbacks run together. Observed downstream as lost writes in
  // dxos/edge#758's neighbourhood: a batch claimed by one pass while the other's caller believes it
  // has flushed everything.
  test('the callback does not overlap itself when runBlocking races a throttled trigger', async () => {
    const ctx = new Context();
    let calls = 0;
    let active = 0;
    let maxActive = 0;
    const scheduler = new UpdateScheduler(
      ctx,
      async () => {
        const call = ++calls;
        active++;
        maxActive = Math.max(maxActive, active);
        // Make the `runBlocking` pass outlast the triggered pass's throttle delay.
        await sleep(call === 2 ? 200 : 10);
        active--;
      },
      { maxFrequency: 10 }, // 100ms between passes.
    );

    // First pass consumes the throttle allowance, so the next `trigger` has to wait one out.
    scheduler.trigger();
    await sleep(40);

    scheduler.trigger(); // Parks in its delay, having seen nothing running.
    const blocking = scheduler.runBlocking(); // Starts a long pass while it sleeps.
    await blocking;
    await sleep(300); // Let the triggered pass run.

    expect(calls, 'both the triggered and blocking passes must have run').toBeGreaterThanOrEqual(3);
    expect(maxActive, 'two callbacks ran at once').toEqual(1);
    await ctx.dispose();
  });
});
