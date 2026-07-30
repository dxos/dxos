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

  // The await-resume gap: a triggered pass and a `runBlocking` can park on the same in-flight pass.
  // On resume the triggered one (queued first) claims the queue and installs itself in `_promise` —
  // and `runBlocking`'s continuation, resumed from an await that saw the *old* pass, then overwrites
  // `_promise` and runs against an empty queue. `runBlocking` resolves, its caller believes
  // everything queued has been handed off, and the claimed batch is still in flight — lost if the
  // caller tears down. Observed as dxos/edge#758's orphaned `updateSubscription` batches. The check
  // must be re-evaluated synchronously before claiming, i.e. a loop, not a single await.
  test('runBlocking does not resolve while a pass that claimed the queue is still in flight', async () => {
    const ctx = new Context();
    const queue: string[] = [];
    const processed: string[] = [];
    let inFlight = 0;
    const gate = { resolve: () => {} };
    const scheduler: UpdateScheduler = new UpdateScheduler(ctx, async () => {
      const claimed = queue.splice(0, queue.length); // Claim synchronously, like _sendUpdates.
      inFlight += claimed.length;
      if (claimed.length > 0) {
        await new Promise<void>((resolve) => {
          gate.resolve = resolve;
          setTimeout(resolve, 50); // The claimed batch takes real time to deliver.
        });
      }
      processed.push(...claimed);
      inFlight -= claimed.length;
    });

    // A long pass is running (claimed nothing of interest)...
    queue.push('warmup');
    scheduler.trigger();
    await sleep(5);

    // ...now the real work arrives; a trigger parks behind the running pass...
    queue.push('document-data');
    scheduler.trigger();
    await sleep(0); // Let the trigger's task start and park on the running pass, as in production.

    // ...and a flush arrives after it.
    await scheduler.runBlocking();

    // Everything that was queued when runBlocking was called must be fully processed — not claimed
    // by a still-running pass the barrier failed to observe.
    expect(inFlight, 'runBlocking resolved with a claimed batch still in flight').toEqual(0);
    expect(processed).toContain('document-data');
    await ctx.dispose();
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
