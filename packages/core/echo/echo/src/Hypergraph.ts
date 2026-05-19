//
// Copyright 2025 DXOS.org
//

import { type EchoURI, type URI } from '@dxos/keys';

import type * as Database from './Database';
import type * as Entity from './Entity';
import type * as internal from './internal';
import type * as Key from './Key';
import type * as Ref from './Ref';
import type { ReadOnlyEvent } from '@dxos/async';

import type * as Obj from './Obj';
import type * as SchemaRegistry from './SchemaRegistry';
import type * as Type from './Type';

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
   * Feed that the resolution is happening from (as an EchoURI).
   * This feed will be searched first, and then the space it belongs to.
   */
  feed?: EchoURI.EchoURI;
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
  middleware?: (obj: internal.AnyProperties) => internal.AnyProperties;
}

/**
 * Minimal interface for the in-process object registry exposed on {@link Hypergraph}.
 * Structurally compatible with `@dxos/echo-registry`'s `Registry.Registry` — defined
 * here to avoid a circular dependency between `@dxos/echo` and `@dxos/echo-registry`.
 */
export interface HypergraphRegistry {
  readonly changed: ReadOnlyEvent<void>;
  readonly local: readonly Obj.Unknown[];
  add(objects: readonly Obj.Unknown[]): void;
  remove(id: string): boolean;
  clear(): void;
  get(id: string): Obj.Unknown | undefined;
  list(): Obj.Unknown[];

  /** Register static TypeScript schema types (no ECHO id required). */
  addTypes(types: readonly Type.AnyEntity[]): void;

  /** Look up a registered schema type by DXN string. */
  getTypeByDXN(dxn: string): Type.AnyEntity | undefined;

  /** All locally-registered schema types. */
  readonly types: readonly Type.AnyEntity[];
}

/**
 * Manages cross-space database interactions.
 */
export interface Hypergraph extends Database.Queryable {
  /**
   * In-process registry of keyed objects and static schema types.
   * Populated at startup via `registry.add(objects)` / `registry.addTypes(schemas)`.
   * Queries that include no explicit from() clause will fan out to this registry automatically.
   */
  get registry(): HypergraphRegistry;

  /**
   * @deprecated Use `registry.addTypes()` / `registry.getTypeByDXN()` instead.
   */
  get schemaRegistry(): SchemaRegistry.SchemaRegistry;

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
   * @param hostDb Host database for reference resolution.
   * @param middleware Called with the loaded object. The caller may change the object.
   * @returns Result of `onLoad`.
   */
  // TODO(dmaretskyi): Restructure API: Remove middleware.
  createRefResolver(options: RefResolverOptions): Ref.Resolver;

  /**
   * Get a database by space ID.
   * @returns The database for the given space ID, or undefined if not found.
   */
  getDatabase(spaceId: Key.SpaceId): Database.Database | undefined;
}
