//
// Copyright 2020 DXOS.org
//

import { type Context, ContextDisposedError } from '@dxos/context';

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

// TODO(burdon): Reconcile with sleep.
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

/**
 * Can be used in long-running tasks to let other callbacks be invoked.
 */
export const asyncReturn = () => sleep(0);

/**
 * Wait for promise or throw error.
 */
export const asyncTimeout = async <T>(promise: Promise<T>, timeout: number, err?: Error | string): Promise<T> => {
  if (typeof promise === 'function') {
    throw new Error('First argument must be a promise.');
  }

  let timeoutId: NodeJS.Timeout;
  const throwable = err === undefined || typeof err === 'string' ? new TimeoutError(timeout, err) : err;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(throwable);
    }, timeout);

    unrefTimeout(timeoutId);
  });

  return await Promise.race([promise, timeoutPromise]).finally(() => {
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
