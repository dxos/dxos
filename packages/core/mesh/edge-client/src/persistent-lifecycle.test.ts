//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep, Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { openAndClose } from '@dxos/test-utils';

import { PersistentLifecycle } from './persistent-lifecycle';

describe('ConnectionState', () => {
  test('first reconnect fires immediately', async () => {
    const triggerCall = new Trigger<number>();
    const persistentLifecycle = new PersistentLifecycle({
      start: async () => {
        triggerCall.wake(Date.now());
      },
      stop: async () => {},
    });
    await openAndClose(persistentLifecycle);

    const triggerTimestamp = Date.now();
    persistentLifecycle.scheduleRestart();
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

    await openAndClose(persistentLifecycle);

    const triggerTimestamp = Date.now();
    await sleep(10);
    const timeToTrigger = (await triggerCall.wait({ timeout: 1000 })) - triggerTimestamp;
    expect(timeToTrigger).to.be.greaterThanOrEqual(100);
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

    persistentLifecycle.scheduleRestart();
    await sleep(10);
    await persistentLifecycle.close();
    expect(restarted).to.be.true;
  });
});
