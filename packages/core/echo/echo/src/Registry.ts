// Copyright 2026 DXOS.org

// @import-as-namespace

import * as Context from 'effect/Context';

import type { ReadOnlyEvent } from '@dxos/async';

import type * as Entity from './Entity';
import type * as SchemaRegistry from './SchemaRegistry';
import type * as Type from './Type';

/**
 * Composable, in-memory registry of keyed ECHO entities.
 *
 * Entities are stored by id and queried via the standard ECHO Query API.
 * A registry may delegate to an optional upstream registry: results from the local
 * registry take precedence and upstream results fill in anything not found locally.
 *
 * Intended use cases include caches of schemas, operations, blueprints, routines, plugins,
 * etc., sourced from 3rd-party plugins, local code, or local space objects.
 *
 * Types (schema-definition entities produced by `Type.makeObject` / `Type.makeRelation`) are
 * stored the same way as any other entity — via `add()`. Use `list().filter(Type.isType)` to
 * retrieve them.
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
   * All locally-stored entities.
   * Does not include upstream entities — use {@link list} for that.
   */
  readonly local: readonly Entity.Unknown[];

  /**
   * Add or replace one or more entities in the local registry.
   * Existing entries with the same id are replaced.
   * Also indexes type entities by DXN for fast lookup via {@link findTypeByDXN}.
   */
  add(entities: readonly Entity.Unknown[]): void;

  /**
   * Remove an entity by id from the local registry.
   * @returns true if an entity was removed, false if it was not found.
   */
  remove(id: string): boolean;

  /**
   * Remove all locally-stored entities.
   * Does not affect the upstream registry.
   */
  clear(): void;

  /**
   * Get an entity by id.
   * Searches the local registry first, then falls back to the upstream registry.
   */
  get(id: string): Entity.Unknown | undefined;

  /**
   * List all entities.
   * Local entities take precedence over upstream entities with the same id.
   */
  list(): Entity.Unknown[];

  /**
   * Persist schemas in the backing database so they replicate to other clients.
   * Creates a PersistentSchema ECHO object for each input and adds it to the space.
   *
   * Requires the registry to be bound to a database.
   * Throws if called on a registry without a database backing (e.g. the hypergraph-level registry).
   */
  register(inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.AnyEntity[]>;
}

/**
 * Options for {@link make}.
 */
export type Options = {
  /**
   * Optional upstream registry. Queries fall back to upstream when an entity
   * is not present in the local registry.
   */
  upstream?: Registry;

  /**
   * Initial set of entities to seed the local registry with.
   */
  initial?: readonly Entity.Unknown[];
};

/**
 * Effect Context tag for {@link Registry}.
 * Use this to inject a registry into Effect-based code.
 */
export class Service extends Context.Tag('@dxos/echo/Registry/Service')<Service, Registry>() {}
