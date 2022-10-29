//
// Copyright 2020 DXOS.org
//

import { createPromiseFromCallback } from './callback';
import { ObservableImpl } from './observable';

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

// TODO(burdon): Separate file for async errors.
export class TimeoutError extends Error {
  constructor(timeout: number, label?: string) {
    super(`Timeout [${timeout}ms]${label && ':'}${label}`);
  }
}

/**
 * Wait for promise or throw error.
 */
// prettier-ignore
export const asyncTimeout = <T>(
  promise: Promise<T> | (() => Promise<T>),
  timeout: number,
  err?: Error | string
): Promise<T> => {
  const conditionTimeout = typeof promise === 'function' ? createPromiseFromCallback<T>(promise) : promise;

  let cancelTimeout: any;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (err === undefined || typeof err === 'string') {
        reject(new TimeoutError(timeout, err));
      } else {
        reject(err);
      }
    }, timeout);

    cancelTimeout = () => {
      clearTimeout(timer);
    };
  });

  return Promise.race([conditionTimeout, timeoutPromise]).finally(() => {
    cancelTimeout();
  });
};

export interface AsyncCallbacks<T = any> {
  onSuccess?(result: T): T;
  onTimeout(err: TimeoutError): void;
  onError(err: Error): void;
}

/**
 * Wait for promise and call callbacks.
 */
// TODO(burdon): Optional retry with back-off?
// prettier-ignore
export const asyncCatch = <T = any> (
  promise: Promise<T> | (() => Promise<T>),
  observable: ObservableImpl<AsyncCallbacks<T>>,
  timeout: number
): void => {
  try {
    setTimeout(async () => {
      const result = await asyncTimeout<T>(promise, timeout);
      observable.callbacks?.onSuccess?.(result);
    });
  } catch (err) {
    if (!observable.callbacks) {
      throw err;
    }

    if (err instanceof TimeoutError) {
      observable.callbacks.onTimeout(err);
    } else if (err instanceof Error) {
      observable.callbacks.onError(err);
    } else if (typeof err === 'string') {
      observable.callbacks.onError(new Error(err));
    } else {
      observable.callbacks.onError(new Error());
    }
  }
};
