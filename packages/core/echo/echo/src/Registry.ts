//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import type { ReadOnlyEvent } from '@dxos/async';

import type * as Obj from './Obj';
import type * as SchemaRegistry from './SchemaRegistry';
import * as Type from './Type';

/**
 * Composable, in-memory registry of keyed ECHO objects.
 *
 * Objects are stored as an array and queried via the standard ECHO Query API.
 * A registry may delegate to an optional upstream registry: results from the local
 * registry take precedence and upstream results fill in anything not found locally.
 *
 * Intended use cases include caches of schemas, operations, blueprints, routines, plugins,
 * etc., sourced from 3rd-party plugins, local code, or local space objects.
 *
 * Scope: a Registry is independent of any ECHO space or Hypergraph — it is a process-local,
 * in-memory cache. Wire one per space (e.g. as a Layer scoped to the space's Effect runtime)
 * or share a single instance across spaces depending on the use case.
 */
export interface Registry {
  /**
   * Fires whenever local registry contents change (add, remove, or clear).
   */
  readonly changed: ReadOnlyEvent<void>;

  /**
   * All locally-stored objects.
   * Does not include upstream objects — use {@link list} for that.
   */
  readonly local: readonly Obj.Unknown[];

  /**
   * Add or replace one or more objects in the local registry.
   * Existing entries with the same id are replaced.
   */
  add(objects: readonly Obj.Unknown[]): void;

  /**
   * Remove an object by id from the local registry.
   * @returns true if an object was removed, false if it was not found.
   */
  remove(id: string): boolean;

  /**
   * Remove all locally-stored objects.
   * Does not affect the upstream registry.
   */
  clear(): void;

  /**
   * Get an object by id.
   * Searches the local registry first, then falls back to the upstream registry.
   */
  get(id: string): Obj.Unknown | undefined;

  /**
   * List all objects.
   * Local objects take precedence over upstream objects with the same id.
   */
  list(): Obj.Unknown[];

  //
  // Static schema types (Type.AnyEntity)
  //

  // TODO(wittjosiah): Can these be integrated into the object registry?

  /**
   * Register static TypeScript schema types.
   * Existing entries with the same DXN are replaced.
   * Also indexes by identifier DXN (TypeIdentifierAnnotationId) if present.
   * Fires {@link changed}.
   */
  addTypes(types: readonly Type.AnyEntity[]): void;

  /**
   * Look up a registered schema type by its DXN string.
   * Falls back to the upstream registry if not found locally.
   */
  getTypeByDXN(dxn: string): Type.AnyEntity | undefined;

  /**
   * All locally-registered schema types as a synchronous snapshot.
   * Suitable for synchronous contexts such as React hooks and atoms.
   * Subscribe to {@link changed} to react to updates.
   * Does not include upstream types.
   */
  readonly types: readonly Type.AnyEntity[];

  /**
   * List all locally-registered schema types as an Effect.
   * Use {@link types} in synchronous contexts; prefer this in Effect generators (yield*) and async functions.
   * Does not include upstream types.
   */
  listTypes(): Effect.Effect<readonly Type.AnyEntity[]>;

  /**
   * Signal that a registered type has changed without adding or removing types.
   * Fires {@link changed}.
   * Used when a PersistentSchema-backed type is invalidated.
   */
  touch(): void;

  /**
   * Persist schemas in the backing database so they replicate to other clients.
   * Creates a PersistentSchema ECHO object for each input and adds it to the space.
   *
   * Requires the registry to be bound to a database.
   * Throws if called on a registry without a database backing (e.g. the hypergraph-level registry).
   */
  register(inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.RuntimeType[]>;
}

/**
 * Options for {@link make}.
 */
export type Options = {
  /**
   * Optional upstream registry. Queries fall back to upstream when an object
   * is not present in the local registry.
   */
  upstream?: Registry;

  /**
   * Initial set of objects to seed the local registry with.
   */
  initial?: readonly Obj.Unknown[];
};

/**
 * Effect Context tag for {@link Registry}.
 * Use this to inject a registry into Effect-based code.
 */
export class Service extends Context.Tag('@dxos/echo/Registry/Service')<Service, Registry>() {}
