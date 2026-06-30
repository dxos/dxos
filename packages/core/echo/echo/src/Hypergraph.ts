//
// Copyright 2025 DXOS.org
//

import { type URI } from '@dxos/keys';

import type * as Database from './Database';
import type * as Entity from './Entity';
import type * as Key from './Key';
import type * as Ref from './Ref';
import type * as Registry from './Registry';

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
   * Feed that the resolution is happening from.
   * This feed will be searched first, and then the space it belongs to.
   */
  feed?: URI.URI;
}

export interface RefResolverOptions {
  /**
   * Resolution context.
   * Affects how non-absolute DXNs are resolved.
   */
  context?: RefResolutionContext;
}

/**
 * Manages cross-space database interactions.
 */
export interface Hypergraph extends Database.Queryable {
  /**
   * In-process registry of keyed objects and static schema types.
   * Populated at startup via `registry.add(objects)` / `registry.add(schemas)`.
   * Queries that include no explicit from() clause will fan out to this registry automatically.
   */
  get registry(): Registry.Registry;

  /**
   * Query objects.
   */
  query: Database.QueryFn;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromURI`
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref.Ref<T>;

  /**
   * Create a resolver that dereferences `Ref`s against this graph. Persisted schema objects are
   * surfaced as their registered `Type.Type` entity.
   */
  createRefResolver(options: RefResolverOptions): Ref.Resolver;

  /**
   * Get a database by space ID.
   * @returns The database for the given space ID, or undefined if not found.
   */
  getDatabase(spaceId: Key.SpaceId): Database.Database | undefined;
}
