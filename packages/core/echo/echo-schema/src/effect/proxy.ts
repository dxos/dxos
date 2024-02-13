//
// Copyright 2024 DXOS.org
//

import { type ReactiveObject } from './reactive';

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
  const handlerSlot: ReactiveHandler<T> = {} as any;
  // TODO(dmaretskyi): Setting the handler instance by prototype is likely to cause issues related to handler properties vs properties of the `mutableHandler` which is gonna be passed as `this` to the handler functions.
  // TODO(dmaretskyi): Replace with an object that proxies those calls.
  Object.setPrototypeOf(handlerSlot, handler);

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
