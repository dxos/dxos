//
// Copyright 2020 DXOS.org
//

import { sleep } from './timeout';
import { Trigger } from './trigger';

/**
 * NOTE: THIS SHOULD ONLY BE USED IN TESTS.
 *
 * Returns a Promise which resolves when `condFn` returns truthy.
 * The value returned by `condFn` is used to resolve the Promise.
 * @param condition Function to call.
 * @param [timeout] How long to wait, in milliseconds (0 = no timeout).
 * @param [interval=10] How frequently to check, in milliseconds.
 */
export const waitForCondition = <FunctionType extends (...args: any) => any>({
  condition,
  timeout = 0,
  interval = 10,
  error,
  breakOnError = false,
}: {
  condition: FunctionType;
  timeout?: number;
  interval?: number;
  error?: Error;
  breakOnError?: boolean;
}) => {
  const stopTime = timeout ? Date.now() + timeout : 0;
  const trigger = new Trigger<ReturnType<FunctionType>>();
  const waiter = async () => {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!stopTime || Date.now() < stopTime) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const value = await condition();
        if (value) {
          trigger.wake(value);
          break;
        }
      } catch (err: any) {
        if (breakOnError === true) {
          trigger.throw(err);
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }
  };

  setTimeout(waiter, 0);

  return trigger.wait({ timeout });
};
