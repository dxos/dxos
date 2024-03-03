//
// Copyright 2024 DXOS.org
//

import { compositeRuntime } from '@dxos/echo-signals/runtime';

/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 */
export class ReactiveArray<T> extends Array<T> {
  static get [Symbol.species]() {
    return Array;
  }

  static {
    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit signal notifications.
     * We wrap them in a batch to avoid unnecessary signal notifications.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: function (this: ReactiveArray<any>, ...args: any[]) {
          let result!: any;
          compositeRuntime.batch(() => {
            result = Array.prototype[method].apply(this, args);
          });
          return result;
        },
      });
    }
  }
}
