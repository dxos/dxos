//
// Copyright 2020 DXOS.org
//

import { createPromiseFromCallback } from './callback';
import { Observable, ObservableProvider } from './observable';

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

// TODO(burdon): Separate declaration file for errors.
export class TimeoutError extends Error {
  constructor(timeout: number, label?: string) {
    super(`Timeout [${timeout}ms]${label === undefined ? '' : ` :${label}`}`);
  }
}

// TODO(burdon): Move to debug.
export const toError = (err: any) => (err === undefined || typeof err === 'string' ? new Error(err) : err);

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

export interface AsyncEvents<T = any> {
  onSuccess?(result: T): T;
  onTimeout(err: TimeoutError): void;
  onError(err: any): void; // TODO(burdon): Util to convert to error.
}

/**
 * Wait for promise and call callbacks.
 */
// TODO(burdon): Optional retry with back-off?
export const asyncTimeoutObservable = <T = any>(
  promise: Promise<T> | (() => Promise<T>),
  timeout: number
): Observable<AsyncEvents<T>> => {
  const observable = new ObservableProvider<AsyncEvents<T>>();

  try {
    setTimeout(async () => {
      const result = await asyncTimeout<T>(promise, timeout);
      observable.callbacks?.onSuccess?.(result);
    });
  } catch (err) {
    if (!observable.callbacks) {
      throw err; // Uncaught.
    }

    if (err instanceof TimeoutError) {
      observable.callbacks.onTimeout(err);
    } else {
      observable.callbacks.onError(toError(err));
    }
  }

  return observable;
};
