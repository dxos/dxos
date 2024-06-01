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
      setTimeout(() => reject(new Error(`Timed out after ${timeout.toLocaleString()}ms`)), timeout);
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

export enum TriggerState {
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

/**
 * Enables blocked listeners to be awakened with optional timeouts.
 *
 * Has two states:
 * - WAITING: promise is in pending state and will be resolved once `wake()` is called.
 * - RESOLVED: promise is already resolved, and all calls to `wait()` resolve immediately.
 * - REJECTED: promise is rejected, and all calls to `wait()` return rejected promise.
 *
 * Trigger starts in WAITING state initially.
 * Use `reset()` to switch resolved trigger back to WAITING state.
 */
export class Trigger<T = void> {
  private _promise!: Promise<T>;
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (error: Error) => void;
  private _state: TriggerState = TriggerState.WAITING;

  constructor(private _options: TriggerOptions = { autoReset: false }) {
    this.reset();
  }

  get state() {
    return this._state;
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
   * NOOP if the trigger is already resolved.
   */
  wake(value: T) {
    this._state = TriggerState.RESOLVED;
    this._resolve(value);
    if (this._options.autoReset) {
      return this.reset();
    }

    return this;
  }

  /**
   * Reset promise (new waiters will wait).
   */
  reset() {
    this._state = TriggerState.WAITING;
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this._promise.catch(() => {}); // Prevent unhandled promise rejections.
    return this;
  }

  /**
   * Throw error to blocked callers (if any).
   * NOOP if the trigger is already resolved.
   */
  throw(error: Error) {
    this._state = TriggerState.REJECTED;
    this._reject(error);
    if (this._options.autoReset) {
      return this.reset();
    }

    return this;
  }
}
