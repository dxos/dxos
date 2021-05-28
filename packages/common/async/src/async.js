//
// Copyright 2020 DXOS.org
//

import { trigger } from './trigger';

// TODO(burdon): Remove.
export const noop = (...args) => args;

/**
 * Timesout after delay.
 * @param timeout
 * @returns {Promise<unknown>}
 */
export const sleep = timeout => new Promise((resolve) => {
  const finish = Date.now() + timeout;

  // setTimeout does not guarantee execution at >= the scheduled time and may execute slightly early.
  const sleeper = () => {
    const delta = finish - Date.now();
    if (delta > 0) {
      setTimeout(sleeper, delta);
    } else {
      resolve();
    }
  };

  sleeper();
});

/**
 * Async timeout
 * @param f
 * @param [timeout]
 * @returns {Promise<unknown>}
 */
export const timeout = (f, timeout = 0) => new Promise((resolve, reject) => {
  const handle = setTimeout(async () => {
    try {
      const value = await f();
      resolve(value);
    } catch (err) {
      reject(err);
    } finally {
      clearTimeout(handle);
    }
  }, timeout);
});

/**
 * @param {Promise} promise
 * @param {Number} timeout
 * @returns {Promise<unknown>}
 */
export const promiseTimeout = (promise, timeout, error) => {
  let cancelTimeout;

  const timeoutPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(error || new Error(`Timed out in ${timeout} ms.`));
    }, timeout);

    cancelTimeout = () => {
      clearTimeout(timer);
      resolve();
    };
  });

  return new Promise((resolve, reject) => {
    Promise.race([
      promise,
      timeoutPromise
    ]).then((...result) => {
      cancelTimeout();
      resolve(...result);
    }, (err) => {
      cancelTimeout();
      reject(err);
    });
  });
};

/**
 * Returns a Promise which resolves when `condFn` returns truthy. The value returned by
 * `condFn` is used to resolve the Promise.
 * @param {function} condFn
 * @param {number} [timeout] How long to wait, in milliseconds (0 = no timeout).
 * @param {number} [interval=10] How frequently to check, in milliseconds.
 * @returns {*}
 */
export const waitForCondition = (condFn, timeout = 0, interval = 10) => {
  const stopTime = timeout ? Date.now() + timeout : 0;
  const [provider, resolver] = trigger();
  const waiter = async () => {
    // eslint-disable-next-line no-unmodified-loop-condition
    while (!stopTime || Date.now() < stopTime) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const value = await condFn();
        if (value) {
          resolver(value);
          break;
        }
      } catch (e) {
        // pass...
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }
  };

  setTimeout(waiter, 0);

  return timeout ? promiseTimeout(provider(), timeout) : provider();
};
