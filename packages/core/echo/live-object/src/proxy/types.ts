//
// Copyright 2024 DXOS.org
//

import { type BaseObject } from '@dxos/echo/internal';

/**
 * Reactive object proxy.
 */
export interface ReactiveHandler<T extends BaseObject> extends ProxyHandler<T> {
  /**
   * Target to Proxy mapping.
   */
  readonly _proxyMap: WeakMap<object, any>;

  /**
   * Called when a proxy is created for this target.
   */
  init(target: T): void;
}

/**
 * For debug-dumping the data of the object.
 */
export const objectData = Symbol.for('@dxos/live-object/objectData');
