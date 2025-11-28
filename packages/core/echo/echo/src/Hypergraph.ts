//
// Copyright 2025 DXOS.org
//

import { type DXN } from '@dxos/keys';

import type * as Database from './Database';
import type * as Entity from './Entity';
import { type AnyProperties } from './internal';
import type * as Key from './Key';
import type * as Ref from './Ref';
import type * as SchemaRegistry from './SchemaRegistry';

/**
 * Resolution context.
 * Affects how non-absolute DXNs are resolved.
 */
export interface RefResolutionContext {
  /**
   * Space that the resolution is happening from.
   */
  space?: Key.SpaceId;

  /**
   * Queue that the resolution is happening from.
   * This queue will be searched first, and then the space it belongs to.
   */
  queue?: DXN;
}

export interface RefResolverOptions {
  /**
   * Resolution context.
   * Affects how non-absolute DXNs are resolved.
   */
  context?: RefResolutionContext;

  /**
   * Middleware to change the resolved object before returning it.
   * @deprecated On track to be removed.
   */
  middleware?: (obj: AnyProperties) => AnyProperties;
}

export interface Hypergraph extends Database.Queryable {
  get schemaRegistry(): SchemaRegistry.SchemaRegistry;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromDXN`
   * `Ref.fromDXN(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(dxn: DXN): Ref.Ref<T>;

  /**
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  // TODO(dmaretskyi): Restructure API: Remove middleware, move `hostDb` into context option. Make accessible on Database objects.
  createRefResolver(options: RefResolverOptions): Ref.Resolver;

  /**
   * Query objects.
   */
  query: Database.QueryFn;
}
