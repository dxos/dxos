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

  // `runBlocking` stores its pass in `_promise`, which `_settle` awaits and the dispose hook drains.
  // So it has to leave `_promise` settled-and-cleared and non-rejecting: a retained promise defeats
  // `_settle`'s fast path for every later call, and a retained *rejected* one makes `join()` and
  // dispose throw, contradicting the "never rejects" contract on the field.
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

  // Same guarantee for the non-scheduling barrier.
  test('join waits for a throttled pass that has not started yet', async () => {
    const ctx = new Context();
    let running = 0;
    let completed = 0;
    const scheduler = new UpdateScheduler(
      ctx,
      async () => {
        running++;
        await sleep(20);
        running--;
        completed++;
      },
      { maxFrequency: 10 },
    );

    await scheduler.runBlocking();
    scheduler.trigger();

    await scheduler.join();

    expect(completed, 'the throttled pass must have completed').toBeGreaterThanOrEqual(2);
    expect(running, 'nothing may still be running').toEqual(0);
  });
});
