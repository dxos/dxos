//
// Copyright 2024 DXOS.org
//

import { compositeRuntime } from '@dxos/echo-signals/runtime';

import { type EchoReactiveHandler } from './echo-handler';
import { type ObjectInternals, symbolHandler, symbolInternals, symbolNamespace, symbolPath } from './echo-proxy-target';
import type { KeyPath } from '../core/key-path';

export class EchoArray<T> extends Array<T> {
  static get [Symbol.species]() {
    return Array;
  }

  // Will be initialize when the proxy is created.
  [symbolInternals]: ObjectInternals = null as any;
  [symbolPath]: KeyPath = null as any;
  [symbolNamespace]: string = null as any;
  [symbolHandler]: EchoReactiveHandler = null as any;

  static {
    /**
     * These methods will trigger proxy traps like `set` and `defineProperty` and emit signal notifications.
     * We wrap them in a batch to avoid unnecessary signal notifications.
     */
    const BATCHED_METHODS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'] as const;

    for (const method of BATCHED_METHODS) {
      const handlerMethodName = `array${method.slice(0, 1).toUpperCase()}${method.slice(1)}`;

      Object.defineProperty(this.prototype, method, {
        enumerable: false,
        value: function (this: EchoArray<any>, ...args: any[]) {
          let result!: any;
          compositeRuntime.batch(() => {
            const handler = this[symbolHandler] as any;
            result = (handler[handlerMethodName] as any).apply(handler, [this, this[symbolPath], ...args]);
          });
          return result;
        },
      });
    }
  }
}
