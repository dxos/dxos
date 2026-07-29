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

  // dxos/edge#758. A throttled `trigger` sleeps out its delay before it registers itself as running,
  // so `runBlocking` used to see nothing to wait for, run its own pass, and resolve — leaving the
  // triggered pass to run afterwards, unobserved. Callers use `runBlocking` as a flush barrier
  // ("everything queued so far has been handed off"), and the callback typically drains shared queued
  // state, so that pass claims work nobody is waiting on. A short-lived writer is then torn down with
  // the batch still in flight and the write is lost.
  test('runBlocking waits for a throttled pass that has not started yet', async () => {
    const ctx = new Context();
    const started: number[] = [];
    const finished: number[] = [];
    let index = 0;
    const scheduler = new UpdateScheduler(
      ctx,
      async () => {
        const id = ++index;
        started.push(id);
        await sleep(20);
        finished.push(id);
      },
      // Throttled, so a triggered pass parks in its delay before touching `_promise`.
      { maxFrequency: 10 },
    );

    // Consume the throttle allowance, then queue a pass that must sit out the delay.
    await scheduler.runBlocking();
    scheduler.trigger();

    await scheduler.runBlocking();

    // Every pass that existed when `runBlocking` returned must have completed, not merely started.
    expect(started.length, 'the throttled pass must have run').toBeGreaterThanOrEqual(2);
    expect(finished, 'no pass may still be in flight').toEqual(started);
  });

  // `join` covers the round in flight and nothing else — that is its contract. It must not chase
  // passes scheduled behind that round: a callback that re-triggers itself would otherwise keep the
  // barrier running until some arbitrary cap and then return with work still pending, which is the
  // false barrier this fix is about. `runBlocking` is the barrier that also covers a scheduled pass.
  test('join waits for the running round only, not for work queued behind it', async () => {
    const ctx = new Context();
    let runs = 0;
    const scheduler: UpdateScheduler = new UpdateScheduler(
      ctx,
      async () => {
        runs++;
        // Re-trigger from inside the callback, indefinitely.
        scheduler.trigger();
        await sleep(1);
      },
      // Throttled, so each chased pass would cost ~100ms.
      { maxFrequency: 10 },
    );

    scheduler.trigger();
    const started = Date.now();
    await scheduler.join();
    const elapsed = Date.now() - started;

    expect(runs, 'the outstanding pass must have run').toBeGreaterThanOrEqual(1);
    // One pass plus its throttle, not a chain of them.
    expect(elapsed, `join took ${elapsed}ms — it is chasing newly scheduled passes`).toBeLessThan(500);
    await ctx.dispose();
  });

  // `runBlocking` stores its pass in `_promise`, which `join()` and the dispose hook await directly.
  // So it has to leave `_promise` settled-and-cleared and non-rejecting: a retained *rejected* one
  // makes both throw, contradicting the "never rejects" contract on the field.
  test('a rejecting runBlocking does not poison later barriers', async () => {
    const ctx = new Context();
    let fail = true;
    const scheduler = new UpdateScheduler(ctx, async () => {
      if (fail) {
        throw new Error('callback failed');
      }
    });

    // The caller must still see the failure.
    await expect(scheduler.runBlocking()).rejects.toThrow('callback failed');

    // ...but the barriers must not inherit it.
    fail = false;
    await expect(scheduler.join()).resolves.toBeUndefined();
    await expect(scheduler.runBlocking()).resolves.toBeUndefined();
    await expect(ctx.dispose()).resolves.not.toThrow();
  });
});
