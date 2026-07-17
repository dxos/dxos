//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';

import { CounterConnection } from './counter-connection';

const nextSubscribedValue = async (connection: CounterConnection): Promise<number> => {
  const trigger = new Trigger<number>();
  const unsubscribe = connection.subscribe((value) => trigger.wake(value));
  try {
    return await asyncTimeout(trigger.wait(), 5_000);
  } finally {
    await unsubscribe();
  }
};

const withCounter = async (fn: (connection: CounterConnection) => Promise<void>): Promise<void> => {
  const connection = new CounterConnection();
  await connection.open();
  onTestFinished(async () => {
    await connection.close();
  });
  await fn(connection);
};

describe('counter worker e2e', () => {
  test('connects over dedicated worker and SharedWorker coordinator', async () => {
    await withCounter(async (connection) => {
      const value = await nextSubscribedValue(connection);
      expect(typeof value).toBe('number');
    });
  });

  test('increment updates the shared counter', async () => {
    await withCounter(async (connection) => {
      const initial = await nextSubscribedValue(connection);
      const updated = await connection.increment();
      expect(updated).toBe(initial + 1);
      expect(await nextSubscribedValue(connection)).toBe(updated);
    });
  });

  test('two clients share one worker counter', async () => {
    const connectionA = new CounterConnection();
    const connectionB = new CounterConnection();
    await connectionA.open();
    await connectionB.open();
    onTestFinished(async () => {
      await Promise.all([connectionA.close(), connectionB.close()]);
    });

    let countA = 0;
    let countB = 0;
    const unsubscribeA = connectionA.subscribe((value) => {
      countA = value;
    });
    const unsubscribeB = connectionB.subscribe((value) => {
      countB = value;
    });
    onTestFinished(async () => {
      await Promise.all([unsubscribeA(), unsubscribeB()]);
    });

    await waitForCondition({ condition: () => countA === countB && countA >= 0, timeout: 5_000 });

    const updated = await connectionA.increment();
    await waitForCondition({ condition: () => countA === updated && countB === updated, timeout: 5_000 });
  });

  test('re-creates the worker when the original owner closes', { timeout: 20_000 }, async () => {
    // The first connection to open wins leader election and owns the spawned worker.
    const owner = new CounterConnection();
    const follower = new CounterConnection();
    await owner.open();
    await follower.open();
    let ownerClosed = false;
    onTestFinished(async () => {
      await Promise.all([ownerClosed ? Promise.resolve() : owner.close(), follower.close()]);
    });

    // Prime the live worker with a non-zero count so re-creation is observable (the worker holds
    // the count in module state, so a freshly-spawned worker starts from zero).
    expect(await owner.increment()).toBe(1);
    expect(await nextSubscribedValue(follower)).toBe(1);

    // Closing the owner terminates its worker; the remaining client must fail over — win leader
    // election and spawn a replacement worker.
    const reconnected = new Trigger();
    follower.reconnected.on(() => {
      reconnected.wake();
    });
    await owner.close();
    ownerClosed = true;
    await asyncTimeout(reconnected.wait(), 15_000);

    // The replacement worker starts from zero, so the next increment returns 1 rather than 2 —
    // proving a new worker was created rather than the original one reused.
    expect(await follower.increment()).toBe(1);
  });
});
