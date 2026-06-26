//
// Copyright 2024 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { log } from '@dxos/log';

import { PersistentLifecycle } from './persistent-lifecycle';
import { sleep } from './timeout';
import { Trigger } from './trigger';

describe('ConnectionState', () => {
  test('first reconnect fires immediately', async () => {
    const triggerCall = new Trigger<number>();
    const persistentLifecycle = new PersistentLifecycle({
      start: async () => {
        triggerCall.wake(Date.now());
      },
      stop: async () => {},
    });
    await persistentLifecycle.open();
    onTestFinished(async () => {
      await persistentLifecycle.close();
    });

    const triggerTimestamp = Date.now();
    void persistentLifecycle.scheduleRestart();
    const timeToTrigger = (await triggerCall.wait({ timeout: 1000 })) - triggerTimestamp;
    expect(timeToTrigger).to.be.lessThan(50);
  });

  test('second reconnect fires after 100ms', async () => {
    let called = 0;
    const triggerCall = new Trigger<number>();

    const persistentLifecycle = new PersistentLifecycle({
      start: async () => {
        called += 1;
        log.info('called', { called });
        if (called < 3) {
          throw new Error('TEST ERROR');
        }
        triggerCall.wake(Date.now());
      },
      stop: async () => {},
    });

    await persistentLifecycle.open();
    onTestFinished(async () => {
      await persistentLifecycle.close();
    });

    const triggerTimestamp = Date.now();
    await sleep(10);
    const timeToTrigger = (await triggerCall.wait({ timeout: 1000 })) - triggerTimestamp;
    expect(timeToTrigger).to.be.greaterThanOrEqual(100);
  });

  test('connection that drops immediately backs off instead of hot-looping', async () => {
    const startTimes: number[] = [];
    const maxStarts = 4;
    const done = new Trigger();

    const persistentLifecycle = new PersistentLifecycle({
      start: async () => {
        startTimes.push(Date.now());
        if (startTimes.length >= maxStarts) {
          done.wake();
        }
      },
      stop: async () => {},
      // Simulate the connection dropping the moment it is established.
      onRestart: async () => {
        if (startTimes.length < maxStarts) {
          void persistentLifecycle.scheduleRestart();
        }
      },
    });

    await persistentLifecycle.open();
    onTestFinished(async () => {
      await persistentLifecycle.close();
    });

    // The initial open already performed the first start; simulate its immediate drop.
    void persistentLifecycle.scheduleRestart();
    await done.wait({ timeout: 5000 });

    // Successive reconnects must back off (~0, ~100, ~200ms), not fire back-to-back.
    const gaps = startTimes.slice(1).map((time, index) => time - startTimes[index]);
    expect(gaps[1]).to.be.greaterThanOrEqual(90);
    expect(gaps[2]).to.be.greaterThanOrEqual(180);
  });

  test('finish `restart` before close', async () => {
    let restarted = false;
    const persistentLifecycle = new PersistentLifecycle({
      start: async () => await sleep(100),
      stop: async () => {},
      onRestart: async () => {
        restarted = true;
      },
    });

    await persistentLifecycle.open();

    void persistentLifecycle.scheduleRestart();
    await sleep(10);
    await persistentLifecycle.close();
    expect(restarted).to.be.true;
  });
});
