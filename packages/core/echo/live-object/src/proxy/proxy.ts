//
// Copyright 2024 DXOS.org
//

import { type BaseObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ReactiveArray } from './array';
import { type ReactiveHandler } from './types';
import type { ReactiveObject } from '../object';

// TODO(burdon): Need tighter tests for these.
// TODO(burdon): Reconcile Proxy and Reactive Object names.

export const symbolIsProxy = Symbol.for('@dxos/schema/Proxy');

export const isReactiveObject = (value: unknown): value is ReactiveObject<any> => !!(value as any)?.[symbolIsProxy];

export const isValidProxyTarget = (value: any): value is object => {
  if (value == null || value[symbolIsProxy]) {
    return false;
  }
  if (value instanceof ReactiveArray) {
    return true;
  }

  return typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
};

/**
 * @deprecated
 */
export const getProxySlot = <T extends BaseObject>(proxy: ReactiveObject<any>): ProxyHandlerSlot<T> => {
  const value = (proxy as any)[symbolIsProxy];
  invariant(value instanceof ProxyHandlerSlot);
  return value;
};

export const getProxyTarget = <T extends BaseObject>(proxy: ReactiveObject<any>): T => {
  return getProxySlot<T>(proxy).target;
};

export const getProxyHandler = <T extends BaseObject>(proxy: ReactiveObject<any>): ReactiveHandler<T> => {
  return getProxySlot<T>(proxy).handler;
};

/**
 * Unsafe method to override id for debugging/testing and migration purposes.
 * @deprecated
 */
export const dangerouslySetProxyId = <T extends BaseObject>(obj: ReactiveObject<T>, id: string) => {
  (getProxySlot(obj).target as any).id = id;
};

/**
 * Create a reactive proxy object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 *
 * @param target Object or array. Passing in array will enable array methods.
 * @param handler ReactiveHandler instance.
 */
// TODO(burdon): Document.
// TODO(burdon): Tests for low-level functions.
export const createProxy = <T extends BaseObject>(target: T, handler: ReactiveHandler<T>): ReactiveObject<T> => {
  const existingProxy = handler._proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // TODO(dmaretskyi): In the future this should be mutable to allow replacing the handler on-the-fly while maintaining the proxy identity.
  const proxy = new Proxy(target, new ProxyHandlerSlot<T>(target, handler));
  handler.init(target);

  // TODO(dmaretskyi): Check if this will actually work; maybe a global WeakMap is better?
  handler._proxyMap.set(target, proxy);
  return proxy;
};

/**
 * Passed as the handler to the Proxy constructor.
 * Maintains a mutable slot for the actual handler.
 */
class ProxyHandlerSlot<T extends BaseObject> implements ProxyHandler<T> {
  /**
   * @param target Original object.
   * @param _handler Handles intercepted operations.
   */
  constructor(
    readonly target: T,
    private _handler: ReactiveHandler<T>,
  ) {}

  get handler() {
    invariant(this._handler);
    return this._handler;
  }

  // TODO(burdon): Requires comment.
  setHandler(handler: ReactiveHandler<T>) {
    this._handler = handler;
  }

  /**
   * Get value.
   */
  get(target: T, prop: string | symbol, receiver: any): any {
    if (prop === symbolIsProxy) {
      return this;
    }

    if (!this._handler || !this._handler.get) {
      return Reflect.get(target, prop, receiver);
    }

    return this._handler.get(target, prop, receiver);
  }

  static {
    const TRAPS: (keyof ProxyHandler<any>)[] = [
      'apply',
      'construct',
      'defineProperty',
      'deleteProperty',
      'get',
      'getOwnPropertyDescriptor',
      'getPrototypeOf',
      'has',
      'isExtensible',
      'ownKeys',
      'preventExtensions',
      'set',
      'setPrototypeOf',
    ];

    for (const trap of TRAPS) {
      if (trap === 'get') {
        continue;
      }

      Object.defineProperty(this.prototype, trap, {
        enumerable: false,
        value: function (this: ProxyHandlerSlot<any>, ...args: any[]) {
          // log.info('trap', { trap, args });
          if (!this._handler || !this._handler[trap]) {
            return (Reflect[trap] as Function)(...args);
          }

          return (this._handler[trap] as Function).apply(this._handler, args);
        },
      });
    }
  }
}
