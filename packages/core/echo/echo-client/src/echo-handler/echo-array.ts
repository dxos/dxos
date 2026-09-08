//
// Copyright 2024 DXOS.org
//

import { type Event } from '@dxos/async';
import { ChangeKeyId, EventId, batchEvents, canonicalOf, getProxyHandler } from '@dxos/echo/internal';

import type { Doc } from '../automerge';
import type { ObjectCore } from '../core-db';
import { type EchoReactiveHandler } from './echo-handler';
import { symbolInternals, symbolNamespace, symbolPath } from './echo-proxy-target';

export class EchoArray<T> extends Array<T> {
  static override get [Symbol.species]() {
    return Array;
  }

  // Declared, not initialized: a class field would be an enumerable own property, and with no `ownKeys`
  // trap to filter it these would leak into `Reflect.ownKeys`, spreads and deep-equality comparisons.
  // The handler installs them as hidden properties when it builds the array.
  declare [symbolInternals]: ObjectCore;
  declare [symbolPath]: Doc.KeyPath;
  declare [symbolNamespace]: string;

  // Installed by the handler's `init`, like every other target's; declared so an array is structurally
  // a `ProxyTarget` and the refresh paths can take one without a cast.
  declare [EventId]: Event<void>;

  // An array does not inherit `EchoRecord`, so it carries the read-only gate's key itself; the
  // `ObjectCore` is the same one the record holding it is gated by.
  get [ChangeKeyId](): object {
    return this[symbolInternals];
  }

  static {
    // Reads are served off the target rather than by a trap, so what the prototype chain answers is
    // what the consumer sees: `constructor` has to be `Array` here, as the trap used to report, or an
    // ECHO array would advertise a class no consumer can construct. `instanceof` walks the prototype
    // chain and is unaffected.
    Object.defineProperty(this.prototype, 'constructor', {
      enumerable: false,
      writable: true,
      configurable: true,
      value: Array,
    });

    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit signal notifications.
     * We wrap them in a batch to avoid unnecessary signal notifications.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      const handlerMethodName = `array${method.slice(0, 1).toUpperCase()}${method.slice(1)}`;

      const fn = function (this: EchoArray<any>, ...args: any[]) {
        let result!: any;
        batchEvents(() => {
          const handler = getProxyHandler<any>(this) as EchoReactiveHandler;
          result = ((handler as any)[handlerMethodName] as Function).apply(handler, [this, this[symbolPath], ...args]);
        });
        // `sort`/`reverse` answer the receiver. Inside `Obj.update` that is the mutable view, which is
        // callback-scoped: hand back the array's canonical identity so `arr.sort() === arr` holds.
        return result === this ? canonicalOf(this) : result;
      };
      Object.defineProperty(fn, 'name', { value: method });
      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: fn,
      });
    }
  }
}
