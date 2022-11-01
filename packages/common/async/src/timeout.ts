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

  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(throwable);
    }, timeout);
  });

  return Promise.race([conditionTimeout, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};
