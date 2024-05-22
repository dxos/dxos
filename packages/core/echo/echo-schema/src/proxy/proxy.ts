//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { ReactiveArray } from './reactive-array';
import { type ReactiveHandler } from './types';
import { type ReactiveObject } from '../types';

export const symbolIsProxy = Symbol('isProxy');

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
 * @param target Object or array. Passing in array will enable array methods.
 * @param handler ReactiveHandler instance.
 */
export const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): ReactiveObject<T> => {
  const existingProxy = handler._proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // TODO(dmaretskyi): in future this should be mutable to allow replacing the handler on the fly while maintaining the proxy identity
  const handlerSlot = new ProxyHandlerSlot<T>();
  handlerSlot.handler = handler;
  handlerSlot.target = target;

  const proxy = new Proxy(target, handlerSlot);
  handler.init(target);

  // TODO(dmaretskyi): Check if this will actually work - maybe a global WeakMap is better?
  handler._proxyMap.set(target, proxy);
  return proxy;
};

/**
 * Passed as the handler to the Proxy constructor.
 * Maintains a mutable slot for the actual handler.
 */
class ProxyHandlerSlot<T extends object> implements ProxyHandler<T> {
  public handler?: ReactiveHandler<T> = undefined;
  public target?: T = undefined;

  get(target: T, prop: string | symbol, receiver: any): any {
    if (prop === symbolIsProxy) {
      return this;
    }

    if (!this.handler || !this.handler.get) {
      return Reflect.get(target, prop, receiver);
    }

    return this.handler.get(target, prop, receiver);
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
          if (!this.handler || !this.handler[trap]) {
            return (Reflect[trap] as Function)(...args);
          }

          return (this.handler[trap] as Function).apply(this.handler, args);
        },
      });
    }
  }
}
export const isReactiveObject = (value: unknown): value is ReactiveObject<any> => !!(value as any)?.[symbolIsProxy];

export const getProxyHandlerSlot = <T extends object>(proxy: ReactiveObject<any>): ProxyHandlerSlot<T> => {
  const value = (proxy as any)[symbolIsProxy];
  invariant(value instanceof ProxyHandlerSlot);
  return value;
};
