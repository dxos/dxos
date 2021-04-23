//
// Copyright 2020 DXOS.org
//

/**
 * Returns a tuple containing a Promise that will be resolved when the resolver function is called.
 */
export function trigger (timeout?: number): [() => Promise<void>, () => void]
export function trigger <T>(timeout?: number): [() => Promise<T>, (arg: T) => void]
export function trigger <T> (timeout?: number): [() => Promise<T>, (arg: T) => void] {
  let callback: (arg: T) => void;
  const promise = new Promise<T>((resolve, reject) => {
    if (timeout) {
      setTimeout(() => reject(new Error(`Timed out after ${timeout}ms`)), timeout);
    }
    callback = resolve;
  });

  return [
    () => promise,
    (value) => callback(value)
  ];
}

/**
 * Use `trigger` instead.
 * @deprecated
 */
// TODO(burdon): Remove.
export const useValue = trigger;

/**
 * Multiple-use version of `trigger`.
 *
 * Has two states:
 * - WAITING: promise is in pending state and will be resolved once `wake()` is called.
 * - READY: promise is already resolved, and all calls to `wait()` resolve immedeately.
 *
 * Trigger starts in WAITING state initially.
 * Use `reset()` to swith resolved trigger back to WAITING state.
 */
export class Trigger {
  _promise!: Promise<void>;
  _wake!: () => void;

  constructor () {
    this.reset();
  }

  wait () {
    return this._promise;
  }

  wake () {
    this._wake();
  }

  reset () {
    const [getPromise, wake] = trigger();
    this._promise = getPromise();
    this._wake = wake;
  }
}
