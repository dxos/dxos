//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import * as S from '@effect/schema/Schema';

import { type ReactiveObject } from './reactive';
import { ReactiveArray } from './reactive-array';
import { ObjectMeta } from '@dxos/echo-pipeline';

export const symbolIsProxy = Symbol('isProxy');

export interface ReactiveHandler<T extends object> extends ProxyHandler<T> {
  /**
   * Target to Proxy mapping.
   */
  readonly _proxyMap: WeakMap<object, any>;

  /**
   * Called when a proxy is created for this target.
   */
  init(target: T): void;

  isObjectDeleted(target: T): boolean;

  getSchema(target: T): S.Schema<any> | undefined;

  getMeta(target: T): ObjectMeta;
}

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

export const isReactiveProxy = (value: unknown): value is ReactiveObject<any> => !!(value as any)?.[symbolIsProxy];

export const getProxyHandlerSlot = <T extends object>(proxy: ReactiveObject<any>): ProxyHandlerSlot<T> => {
  const value = (proxy as any)[symbolIsProxy];
  invariant(value instanceof ProxyHandlerSlot);
  return value;
};
