//
// Copyright 2024 DXOS.org
//

import { type ReactiveObject } from './reactive';

export const symbolIsProxy = Symbol('isProxy');

export const isValidProxyTarget = (value: any): value is object =>
  typeof value === 'object' &&
  value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === Array.prototype) &&
  !value[symbolIsProxy];

/**
 *
 * @param target Object or array. Passing in array will enable array methods.
 */
export const createReactiveProxy = <T extends {}>(target: T, handler: ReactiveHandler<T>): ReactiveObject<T> => {
  const existingProxy = handler._proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // TODO(dmaretskyi): in future this should be mutable to allow replacing the handler on the fly while maintaining the proxy identity
  const handlerSlot = new ProxyHandlerSlot<T>();
  handlerSlot.handler = handler;

  const proxy = new Proxy(target, handlerSlot);
  handler._init(target);

  // TODO(dmaretskyi): Check if this will actually work - maybe a global WeakMap is better?
  handler._proxyMap.set(target, proxy);
  return proxy;
};

export interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  readonly _proxyMap: WeakMap<object, any>;

  /**
   * Called when a proxy is created for this target.
   */
  _init(target: T): void;
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
