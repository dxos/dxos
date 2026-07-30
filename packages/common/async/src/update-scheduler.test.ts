//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { Context } from '@dxos/context';

import { sleep } from './timeout';
import { UpdateScheduler } from './update-scheduler';

describe('update-scheduler', () => {
  test('schedules updates', async ({ expect }) => {
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

  // The flush-barrier contract: when `runBlocking` resolves, everything that was queued at call time
  // has been fully processed — not claimed by a still-running pass the barrier failed to observe.
  // Historically a triggered pass and a `runBlocking` could park on the same in-flight pass; on
  // resume the triggered one claimed the queue and the flush ran against nothing, resolving while
  // the claimed batch was still in flight — lost if the caller tore down (dxos/edge#758's orphaned
  // `updateSubscription` batches). The single-door design makes the flush wait for the run that
  // adopts its enqueued state, whoever starts it.
  test('runBlocking does not resolve while a pass that claimed the queue is still in flight', async ({ expect }) => {
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
  // once each claim part of the queue. Historically a throttled `trigger` checked for a running pass
  // *before* its delay while `runBlocking` claimed directly — so a flush could start a pass while the
  // triggered one slept, and both callbacks ran together (dxos/edge#758). Under the single-door
  // design the flush coalesces onto the sleeping runner instead, so the same scenario yields fewer
  // runs — the invariants are that no two callbacks ever overlap and the flush still completes.
  test('the callback does not overlap itself when runBlocking races a throttled trigger', async ({ expect }) => {
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

    expect(calls, 'the coalesced flush run must have happened').toBeGreaterThanOrEqual(2);
    expect(maxActive, 'two callbacks ran at once').toEqual(1);
    await ctx.dispose();
  });

  // `runBlocking` is a flush barrier: a caller must observe that its batch was NOT handed off. The
  // error belongs to the callers waiting on that run — and must not poison later barriers (a
  // retained rejected pass would make `join`/dispose throw someone else's stale error).
  test('runBlocking rejects with its run error and later barriers stay clean', async ({ expect }) => {
    const ctx = new Context();
    let fail = true;
    const scheduler = new UpdateScheduler(ctx, async () => {
      if (fail) {
        throw new Error('send failed');
      }
    });

    await expect(scheduler.runBlocking()).rejects.toThrow('send failed');

    fail = false;
    await expect(scheduler.join()).resolves.toBeUndefined();
    await expect(scheduler.runBlocking()).resolves.toBeUndefined();
    await ctx.dispose();
  });

  // Concurrent flushes coalesce onto one run that observes everything enqueued before either call —
  // they are all asking the same question ("has what I queued been handed off?"), so one drain
  // answers all of them.
  test('concurrent runBlocking callers coalesce into a single run', async ({ expect }) => {
    const ctx = new Context();
    const queue: string[] = [];
    const drained: string[][] = [];
    const scheduler = new UpdateScheduler(ctx, async () => {
      drained.push(queue.splice(0, queue.length));
      await sleep(10);
    });

    queue.push('a', 'b');
    await Promise.all([scheduler.runBlocking(), scheduler.runBlocking()]);

    expect(drained.length).toEqual(1);
    expect(drained[0]).toEqual(['a', 'b']);
    await ctx.dispose();
  });

  // Flush is urgent: it must not sit out the `maxFrequency` delay of a pass that was scheduled
  // before it (the delay exists to pace background triggers, not barriers).
  test('runBlocking skips the throttle delay', async ({ expect }) => {
    const ctx = new Context();
    let runs = 0;
    const scheduler = new UpdateScheduler(
      ctx,
      async () => {
        runs++;
      },
      { maxFrequency: 2 }, // 500ms between passes.
    );

    // Consume the allowance, then queue a throttled pass.
    await scheduler.runBlocking();
    scheduler.trigger();

    const started = performance.now();
    await scheduler.runBlocking();
    const elapsed = performance.now() - started;

    expect(runs).toBeGreaterThanOrEqual(2);
    expect(elapsed, `flush waited out the throttle (${Math.round(elapsed)}ms)`).toBeLessThan(400);
    await ctx.dispose();
  });

  // A dispose must release a parked flush rather than strand it: the runner it was waiting on may
  // never reach its claim once the context is gone.
  test('dispose releases a parked runBlocking', async ({ expect }) => {
    const ctx = new Context();
    const scheduler = new UpdateScheduler(
      ctx,
      async () => {
        await sleep(5);
      },
      { maxFrequency: 1 }, // 1000ms delay — the flush parks behind it.
    );

    await scheduler.runBlocking(); // Consume the allowance.
    scheduler.trigger();
    // Park a flush on the throttled runner, then dispose before it can claim.
    const parked = (async () => {
      // Re-arm the delay skip is deliberately NOT done here: dispose must be what releases it.
      const completionBefore = scheduler.runBlocking();
      return completionBefore;
    })();
    await sleep(10);
    await ctx.dispose();

    await expect(parked).resolves.toBeUndefined();
  });
});
