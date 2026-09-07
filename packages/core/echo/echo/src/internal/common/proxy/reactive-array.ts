//
// Copyright 2024 DXOS.org
//

import { createArrayMethodError } from './errors';
import { batchEvents } from './event-batch';
import { changeKeyOf } from './ownership';
import { assertMutable } from './proxy-utils';
import { ChangeKeyId } from './symbols';

/**
 * Extends the native array to make sure that arrays methods are correctly reactive.
 * Enforces that mutations only happen within Obj.update() context.
 */
export class ReactiveArray<T> extends Array<T> {
  static override get [Symbol.species]() {
    return Array;
  }

  /**
   * The read-only gate's key. An array keeps this prototype chain rather than being compacted onto the
   * record behaviour prototype, so it answers for itself; the key is the same root the record holding
   * it is gated by.
   */
  get [ChangeKeyId](): object | undefined {
    return changeKeyOf(this);
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
          // A method call is invisible to the proxy, so it runs the same gate the traps run.
          assertMutable(this, method, createArrayMethodError);

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
