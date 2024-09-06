//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { sleep, Trigger } from '@dxos/async';
import { describe, openAndClose, test } from '@dxos/test';

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
    let firstCall = true;
    const triggerCall = new Trigger<number>();
    const persistentLifecycle = new PersistentLifecycle({
      start: async () => {
        if (firstCall) {
          firstCall = false;
          throw new Error('TEST ERROR');
        }

        triggerCall.wake(Date.now());
      },
      stop: async () => {},
    });
    await openAndClose(persistentLifecycle);

    persistentLifecycle.scheduleRestart();
    await sleep(1);
    const triggerTimestamp = Date.now();
    persistentLifecycle.scheduleRestart();
    const timeToTrigger = (await triggerCall.wait({ timeout: 1000 })) - triggerTimestamp;
    expect(timeToTrigger).to.be.greaterThan(100);
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
    await sleep(1);
    await persistentLifecycle.close();
    expect(restarted).to.be.true;
  });
});
