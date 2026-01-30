//
// Copyright 2024 DXOS.org
//

import { isInChangeContext } from './change-context';
import { createArrayMethodError } from './errors';
import { batchEvents } from './event-batch';
import { getProxyTarget, isProxy } from './proxy-utils';
import { ChangeId, EventId } from './symbols';
import { getEchoRoot } from './typed-handler';

/**
 * Check if array mutation is allowed (inside a change context).
 * Throws a descriptive error if not.
 */
const checkArrayMutationAllowed = (arr: any, method: string): void => {
  // Get the raw target - if arr is a proxy, get its underlying target.
  const target = isProxy(arr) ? getProxyTarget(arr) : arr;

  // Find the root ECHO object.
  const echoRoot = getEchoRoot(target);

  // Check if initialized (has ChangeId marker or EventId).
  const isInitialized = (echoRoot as any)[ChangeId] === true || EventId in echoRoot;
  if (!isInitialized) {
    // Array is still being initialized, allow mutations.
    return;
  }

  if (!isInChangeContext(echoRoot)) {
    throw createArrayMethodError(method);
  }
};

/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 * Enforces that mutations only happen within Obj.change() context.
 */
export class ReactiveArray<T> extends Array<T> {
  static override get [Symbol.species]() {
    return Array;
  }

  static {
    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit event notifications.
     * We wrap them in a batch to avoid unnecessary event notifications.
     * Change context is checked before allowing mutations.
     *
     * Note: When called on a proxy, `this` will be the proxy, so array mutations
     * go through the proxy's set trap which handles event emission.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: function (this: ReactiveArray<any>, ...args: any[]) {
          // Check change context before allowing mutation.
          checkArrayMutationAllowed(this, method);

          let result!: any;
          batchEvents(() => {
            result = Array.prototype[method].apply(this, args);
          });
          return result;
        },
      });
    }
  }
}
