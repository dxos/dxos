//
// Copyright 2020 DXOS.org
//

import { createPromiseFromCallback } from './callback';
import { TimeoutError } from './errors';

/**
 * Times out after delay.
 */
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const finish = Date.now() + ms;

    // `setTimeout` does not guarantee execution at >= the scheduled time and may execute slightly early.
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
 * Wait for promise or throw error.
 */
// prettier-ignore
export const asyncTimeout = <T>(
  promise: Promise<T> | (() => Promise<T>),
  timeout: number,
  err?: Error | string
): Promise<T> => {
  const throwable = (err === undefined || typeof err === 'string') ? new TimeoutError(timeout, err) : err;
  const conditionTimeout = typeof promise === 'function' ? createPromiseFromCallback<T>(promise) : promise;

  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(throwable);
    }, timeout);

    // In Node.JS, `unref` prevents the timeout from blocking the process from exiting. Not available in browsers.
    // https://nodejs.org/api/timers.html#timeoutunref
    if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
      timeoutId.unref();
    }
  });

  return Promise.race([conditionTimeout, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};
