// Copyright 2026 DXOS.org

// @import-as-namespace

import * as Context from 'effect/Context';

import { type ReadOnlyEvent } from '@dxos/async';

import type * as Database from './Database';
import * as Entity from './Entity';

/**
 * Identifier denoting an ECHO Registry.
 */
export const TypeId = Symbol.for('@dxos/echo/Registry');
export type TypeId = typeof TypeId;

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
 *
 * The concrete implementation (and the `makeRegistry` / `registryLayer` factories) lives in
 * `@dxos/echo-db`; this module declares only the interface so that the `@dxos/echo` API surface
 * stays free of query-matching dependencies.
 */
export interface Registry {
  readonly [TypeId]: TypeId;

  /**
   * Stable per-instance identifier. Used to key process-local resources (e.g. memoized
   * reactive atoms) to a specific registry instance, analogous to {@link Database.spaceId}.
   */
  readonly id: string;

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
   * Also indexes type entities by DXN for fast lookup.
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
   * Get an entity by one of its addressing URIs — a type entity by its typename DXN (or, when
   * persisted, its identifier EID), a keyed entity by its `dxn:<key>[:<version>]`. Accepts legacy
   * DXN forms (normalized internally). Searches the local registry first, then falls back to the
   * upstream registry. Narrow the result with `Type.isType` when a type entity is required.
   */
  getByURI(uri: string): Entity.Unknown | undefined;

  /**
   * List all entities.
   * Local entities take precedence over upstream entities with the same id.
   */
  list(): Entity.Unknown[];

  /**
   * Run an ECHO query against the registry's entities (implements {@link Database.Queryable}).
   *
   * Matching happens in-memory over {@link list}. Scope (`from`) clauses are unwrapped and
   * ignored — a direct registry query always targets the registry's own entities. The primary
   * way to query registry contents is still through the database (`db.query(...).from(Scope.registry())`),
   * which fans the database and registry together; this method is for querying a registry directly.
   *
   * Only locally-evaluable AST nodes are supported: `select`, `filter`, `limit`, `from`, `options`,
   * and boolean combinators. Server-side concerns (order, traversal, text/timestamp filters) throw.
   */
  query: Database.QueryFn;
}

/**
 * Type guard for {@link Registry}.
 */
export const isRegistry = (obj: unknown): obj is Registry =>
  obj != null && typeof obj === 'object' && TypeId in obj && (obj as { [TypeId]?: unknown })[TypeId] === TypeId;

/**
 * Options for the registry factory (`makeRegistry` in `@dxos/echo-db`).
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
