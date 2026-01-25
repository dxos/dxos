//
// Copyright 2024 DXOS.org
//

import { batchEvents } from '../event-batch';

/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 */
export class ReactiveArray<T> extends Array<T> {
  static override get [Symbol.species]() {
    return Array;
  }

  static {
    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit event notifications.
     * We wrap them in a batch to avoid unnecessary event notifications.
     *
     * Note: When called on a proxy, `this` will be the proxy, so array mutations
     * go through the proxy's set trap which handles event emission.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: function (this: ReactiveArray<any>, ...args: any[]) {
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
