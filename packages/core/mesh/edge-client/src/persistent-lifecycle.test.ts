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
          throw new Error('Failed to connect');
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
});
