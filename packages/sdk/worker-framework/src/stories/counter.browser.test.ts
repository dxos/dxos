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
});
