//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { FairLock } from './fair-lock.ts';

describe('FairLock', () => {
  test('a holder that releases and takes again queues behind the waiters', async ({ expect }) => {
    const lock = new FairLock();
    const order: string[] = [];
    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* lock.take;
        const waiter = yield* Effect.forkChild(lock.withLock(Effect.sync(() => order.push('waiter'))));
        yield* Effect.yieldNow;
        yield* lock.release;
        yield* lock.withLock(Effect.sync(() => order.push('holder')));
        yield* Fiber.join(waiter);
      }),
    );
    expect(order).toEqual(['waiter', 'holder']);
  });

  test('a waiter interrupted before its turn passes the lock on', async ({ expect }) => {
    const lock = new FairLock();
    const order: string[] = [];
    await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* lock.take;
        const cancelled = yield* Effect.forkChild(lock.withLock(Effect.sync(() => order.push('cancelled'))));
        const next = yield* Effect.forkChild(lock.withLock(Effect.sync(() => order.push('next'))));
        yield* Effect.yieldNow;
        const interruption = yield* Effect.forkChild(Fiber.interrupt(cancelled));
        yield* Effect.yieldNow;
        yield* lock.release;
        yield* Fiber.join(interruption);
        yield* Fiber.join(next);
      }),
    );
    expect(order).toEqual(['next']);
  });
});
