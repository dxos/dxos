//
// Copyright 2020 DXOS.org
//

import { asyncTimeout, sleep } from './timeout';
import { trigger } from './trigger';

/**
 * NOTE: THIS SHOULD ONLY BE USED IN TESTS.
 *
 * Returns a Promise which resolves when `condFn` returns truthy.
 * The value returned by `condFn` is used to resolve the Promise.
 * @param condition Function to call.
 * @param [timeout] How long to wait, in milliseconds (0 = no timeout).
 * @param [interval=10] How frequently to check, in milliseconds.
 */
export const waitForCondition = (condition: Function, timeout = 0, interval = 10) => {
  const stopTime = timeout ? Date.now() + timeout : 0;
  const [provider, resolver] = trigger<any>();
  const waiter = async () => {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!stopTime || Date.now() < stopTime) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const value = await condition();
        if (value) {
          resolver(value);
          break;
        }
      } catch (err) {
        // Pass...
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }
  };

  setTimeout(waiter, 0);

  return timeout ? asyncTimeout(provider(), timeout, new Error('Timeout')) : provider();
};
