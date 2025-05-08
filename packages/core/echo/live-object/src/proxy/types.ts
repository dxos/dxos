//
// Copyright 2024 DXOS.org
//

import { type Schema as S } from 'effect';

import { type Reference } from '@dxos/echo-protocol';
import { type BaseObject, type ObjectMeta } from '@dxos/echo-schema';

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

  // TODO(dmaretskyi): Remove, change to symbol getter.
  isDeleted(target: T): boolean;

  // TODO(dmaretskyi): Remove and use schemaSymbol.
  getSchema(target: T): S.Schema.AnyNoContext | undefined;

  /**
   * We always store a type reference together with an object, but schema might not have been
   * registered or replicated yet.
   */
  // TODO(dmaretskyi): Remove and use typenameSymbol.
  getTypeReference(target: T): Reference | undefined;

  // TODO(dmaretskyi): Remove and change to symbol getter.
  getMeta(target: T): ObjectMeta;
}

/**
 * For debug-dumping the data of the object.
 */
export const objectData = Symbol.for('@dxos/live-object/objectData');
