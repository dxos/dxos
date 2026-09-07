//
// Copyright 2024 DXOS.org
//

import { type Event } from '@dxos/async';
import { EventId, batchEvents } from '@dxos/echo/internal';

import type { Doc } from '../automerge';
import type { ObjectCore } from '../core-db';
import { type EchoReactiveHandler } from './echo-handler';
import { symbolHandler, symbolInternals, symbolNamespace, symbolPath } from './echo-proxy-target';

export class EchoArray<T> extends Array<T> {
  static override get [Symbol.species]() {
    return Array;
  }

  // Will be initialize when the proxy is created.
  [symbolInternals]: ObjectCore = null as any;
  [symbolPath]: Doc.KeyPath = null as any;
  [symbolNamespace]: string = null as any;
  [symbolHandler]: EchoReactiveHandler = null as any;

  // Installed by the handler's `init`, like every other target's; declared so an array is structurally
  // a `ProxyTarget` and the refresh paths can take one without a cast.
  declare [EventId]: Event<void>;

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
          const handler = this[symbolHandler];
          result = ((handler as any)[handlerMethodName] as Function).apply(handler, [this, this[symbolPath], ...args]);
        });
        return result;
      };
      Object.defineProperty(fn, 'name', { value: method });
      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: fn,
      });
    }
  }
}
