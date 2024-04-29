//
// Copyright 2020 DXOS.org
//

import { TimeoutError } from './errors';
import { asyncTimeout } from './timeout';

/**
 * Returns a tuple containing a Promise that will be resolved when the resolver function is called.
 * @deprecated Use `Trigger` instead.
 */
export const trigger = <T = void>(timeout?: number): [() => Promise<T>, (arg: T) => void] => {
  // eslint-disable-line @stayradiated/prefer-arrow-functions/prefer-arrow-functions
  let callback: (arg: T) => void;

  const promise = new Promise<T>((resolve, reject) => {
    if (timeout) {
      setTimeout(() => reject(new Error(`Timed out after ${timeout}ms`)), timeout);
    }

    callback = resolve;
  });

  const provider = () => promise;
  const resolver = (value: T) => callback(value);

  return [provider, resolver];
};

export type TriggerOptions = {
  autoReset: boolean;
};

/**
 * Enables blocked listeners to be awakened with optional timeouts.
 *
 * Has two states:
 * - WAITING: promise is in pending state and will be resolved once `wake()` is called.
 * - READY: promise is already resolved, and all calls to `wait()` resolve immediately.
 *
 * Trigger starts in WAITING state initially.
 * Use `reset()` to switch resolved trigger back to WAITING state.
 */
export class Trigger<T = void> {
  private _promise!: Promise<T>;
  private _wake!: (value: T | PromiseLike<T>) => void;

  constructor(private _options: TriggerOptions = { autoReset: false }) {
    this.reset();
  }

  /**
   * Wait until wake is called, with optional timeout.
   */
  async wait({ timeout }: { timeout?: number } = {}): Promise<T> {
    if (timeout) {
      return asyncTimeout(this._promise, timeout, new TimeoutError(timeout));
    } else {
      return this._promise;
    }
  }

  /**
   * Wake blocked callers (if any).
   */
  wake(value: T) {
    this._wake(value);
    if (this._options.autoReset) {
      return this.reset();
    }

    return this;
  }

  /**
   * Reset promise (new waiters will wait).
   */
  reset() {
    this._promise = new Promise<T>((resolve) => {
      this._wake = resolve;
    });
    this._promise.catch(() => {}); // Prevent unhandled promise rejections.

    return this;
  }

  /**
   * Throw error to blocked callers (if any).
   */
  throw(error: Error) {
    this._wake(Promise.reject(error));
    if (this._options.autoReset) {
      return this.reset();
    }

    return this;
  }
}
