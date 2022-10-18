//
// Copyright 2020 DXOS.org
//

import { trigger } from './trigger';

/**
 * A locking mechanism to ensure that a given section of the code is executed by only one single "thread" at a time.
 *
 * Functions are chained in a structure similar to a linked list.
 * `_lastPromise` always contains the function that will finish executing last.
 *
 * Initially it is set to `Promise.resolve()` -- a promise that resolves immediately.
 * Enqueuing is done by attaching provided function to the `_lastPromise` via a `.then()` call
 * then updating the `_lastPromise` variable.
 *
 * It is important that enqueuing is done atomically:
 * there are no `await`s in `executeSynchronized` and it's not async while still returning a promise.
 *
 * Java docs reference on synchronized sections:
 * https://docs.oracle.com/javase/tutorial/essential/concurrency/locksync.html
 */
export class Lock {
  private _lastPromise = Promise.resolve();

  /**
   * Waits for all previous executions to complete and then executes a given function.
   * Only a single function can be executed at a time.
   * Function are executed in the same order as `executeSynchronized` is called.
   * WARNING: Calling `executeSynchronized` inside of `executeSynchronized` on the same lock instance is a deadlock.
   */
  async executeSynchronized<T> (fun: () => Promise<T>): Promise<T> {
    const prevPromise = this._lastPromise;

    // Immediately update the promise before invoking any async actions so that next invocation waits for our task to complete.
    const [getPromise, resolve] = trigger();
    this._lastPromise = getPromise();

    await prevPromise;
    try {
      return await fun();
    } finally {
      resolve();
    }
  }
}

const classLockSymbol = Symbol('class-lock');

/**
 * Same as `synchronized` in Java.
 * Uses a lock global to the current class instance.
 * This way every synchronized method on the same instance will share a single lock.
 */
export const synchronized = (
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<(...args: any) => any>
) => {
  const method = descriptor.value!;
  descriptor.value = function (this: any, ...args: any) {
    const lock: Lock = this[classLockSymbol] ?? (this[classLockSymbol] = new Lock());
    return lock.executeSynchronized(() => method.apply(this, args));
  };
};
