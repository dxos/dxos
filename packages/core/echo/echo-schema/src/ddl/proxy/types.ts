//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { type ObjectMeta } from '../types';

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
