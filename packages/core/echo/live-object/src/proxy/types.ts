//
// Copyright 2024 DXOS.org
//

import { type Reference } from '@dxos/echo-protocol';
import { type BaseObject, type ObjectMeta } from '@dxos/echo-schema';
import { type S } from '@dxos/effect';

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

  isDeleted(target: T): boolean;

  getSchema(target: T): S.Schema<any> | undefined;

  /**
   * We always store a type reference together with an object, but schema might not have been
   * registered or replicated yet.
   */
  getTypeReference(target: T): Reference | undefined;

  getMeta(target: T): ObjectMeta;
}
