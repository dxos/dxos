//
// Copyright 2024 DXOS.org
//

import { Ref } from 'effect';
import { type ReactiveObject } from './reactive';

export const symbolIsProxy = Symbol('isProxy');

export const isValidProxyTarget = (value: any): value is object =>
  typeof value === 'object' &&
  value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === Array.prototype);

export const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): ReactiveObject<T> => {
  if (!isValidProxyTarget(target)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  const existingProxy = handler._proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // TODO(dmaretskyi): in future this should be mutable to allow replacing the handler on the fly while maintaining the proxy identity
  const handlerSlot = new ProxyHandlerSlot<T>();
  handlerSlot.handler = handler;

  const proxy = new Proxy(target, handlerSlot);
  handler._init(target);
  handler._proxyMap.set(target, proxy);
  return proxy;
};

export interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  /**
   * Called when a proxy is created for this target.
   */
  _init(target: T): void;

  readonly _proxyMap: WeakMap<object, any>;
}

/**
 * Passed as the handler to the Proxy constructor.
 * Maintains a mutable slot for the actual handler.
 */
class ProxyHandlerSlot<T extends object> implements ProxyHandler<T> {
  public handler?: ReactiveHandler<T> = undefined;

  get(target: T, prop: string | symbol, receiver: any): any {
    if (prop === symbolIsProxy) {
      return true;
    }

    if (!this.handler || !this.handler.get) {
      return Reflect.get(target, prop, receiver);
    }

    return this.handler.get(target, prop, receiver);
  }
}

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

  Object.defineProperty(ProxyHandlerSlot.prototype, trap, {
    value: function (this: ProxyHandlerSlot<any>, ...args: any[]) {
      if (!this.handler || !this.handler[trap]) {
        return (Reflect[trap] as Function)(...args);
      }

      return (this.handler[trap] as Function).apply(this.handler, args);
    },
  });
}
