//
// Copyright 2020 DXOS.org
//

import { type Context, ContextDisposedError } from '@dxos/context';

import { createPromiseFromCallback } from './callback';
import { TimeoutError } from './errors';

/**
 * Times out after delay.
 */
export const sleep = (ms: number) => {
  return new Promise<void>((resolve) => {
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
};

/**
 * Can be used in long-running tasks to let other callbacks be invoked.
 */
export const asyncReturn = () => sleep(0);

/**
 * Wait for promise or throw error.
 */
export const asyncTimeout = async <T>(
  promise: Promise<T> | (() => Promise<T>),
  timeout: number,
  err?: Error | string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const throwable = err === undefined || typeof err === 'string' ? new TimeoutError(timeout, err) : err;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(throwable);
    }, timeout);

    unrefTimeout(timeoutId);
  });

  const conditionTimeout = typeof promise === 'function' ? createPromiseFromCallback<T>(promise) : promise;
  return await Promise.race([conditionTimeout, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

/**
 * In Node.JS, `unref` prevents the timeout from blocking the process from exiting. Not available in browsers.
 * https://nodejs.org/api/timers.html#timeoutunref
 */
export const unrefTimeout = (timeoutId: NodeJS.Timeout) => {
  if (typeof timeoutId === 'object' && 'unref' in timeoutId) {
    timeoutId.unref();
  }
};

export const sleepWithContext = (ctx: Context, ms: number) => {
  const error = new ContextDisposedError();
  return new Promise<void>((resolve, reject) => {
    if (ctx.disposed) {
      reject(error);
      return;
    }

    const timeout = setTimeout(() => {
      clearDispose();
      resolve();
    }, ms);

    const clearDispose = ctx.onDispose(() => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};
