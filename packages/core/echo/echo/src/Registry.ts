// Copyright 2026 DXOS.org

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import { type ReadOnlyEvent } from '@dxos/async';
import { type URI } from '@dxos/keys';

import type * as Database from './Database.ts';
import * as Entity from './Entity.ts';
import type * as Filter from './Filter.ts';
import * as registryAtoms from './internal/Registry/atoms.ts';
import type * as Query from './Query.ts';

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
 * Intended use cases include caches of schemas, operations, skills, routines, plugins,
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
 * `@dxos/echo-client`; this module declares only the interface so that the `@dxos/echo` API surface
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
   *
   * @performance O(n); allocates a new array on every read.
   */
  readonly local: readonly Entity.Unknown[];

  /**
   * Add or replace one or more entities in the local registry.
   * Existing entries with the same id are replaced.
   * Also indexes type entities by DXN for fast lookup.
   *
   * @performance O(n) in entities, each indexed by id and URI, then one `changed` emission.
   */
  add(entities: readonly Entity.Unknown[]): void;

  /**
   * Remove an entity by id from the local registry.
   * @returns true if an entity was removed, false if it was not found.
   *
   * @performance O(u) in the URI index, which it scans for entries pointing at the entity.
   */
  remove(id: string): boolean;

  /**
   * Remove all locally-stored entities.
   * Does not affect the upstream registry.
   *
   * @performance O(1) map clears plus one `changed` emission.
   */
  clear(): void;

  /**
   * Get an entity by id.
   * Searches the local registry first, then falls back to the upstream registry.
   *
   * @performance O(1) map lookup, then the same in the upstream on a miss.
   */
  get(id: string): Entity.Unknown | undefined;

  /**
   * Get an entity by one of its addressing URIs — a type entity by its typename DXN (or, when
   * persisted, its identifier EID), a keyed entity by its `dxn:<key>[:<version>]`. Accepts legacy
   * DXN forms (normalized internally). Searches the local registry first, then falls back to the
   * upstream registry. Narrow the result with `Type.isType` when a type entity is required.
   *
   * @performance O(1) map lookup after URI normalization, then the same in the upstream on a miss.
   */
  getByURI(uri: string): Entity.Unknown | undefined;

  /**
   * List all entities.
   * Local entities take precedence over upstream entities with the same id.
   *
   * @performance O(n) in local plus upstream entities; allocates a merged array per call.
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
   * and boolean combinators, plus full-text filters as case-insensitive all-terms containment.
   * Server-side concerns (order, traversal, vector search, timestamp filters) throw or match nothing.
   *
   * `run()` first asks the registry's {@link Source}s for what the query selects and the registry lacks (see
   * {@link fetch}); `runSync()` and `results` read only what the registry holds.
   *
   * @performance O(n · filter size) linear scan of `list()` on every read; results are not cached between reads.
   */
  query: Database.QueryFn;

  /**
   * Adds a source the registry consults for what it does not hold.
   * @returns A function that removes the source.
   */
  addSource(source: Source): () => void;

  /**
   * The entity a URI addresses: from the registry, or else from its sources, which adds it to the registry.
   * Undefined when neither holds it; a failing source reads as one that does not.
   */
  resolve(uri: URI.URI): Promise<Entity.Unknown | undefined>;

  /**
   * Asks the sources for what `query` selects and the registry lacks, and adds their answers: the entities its keys
   * (`Filter.key`) name, or for a query that names none, what each enumerating source returns for it, asked once per
   * query.
   */
  fetch(query: Query.Any): Promise<void>;
}

/**
 * A registry the in-process one consults for what it does not hold, e.g. EDGE's registry of the types, skills and
 * operations of the plugins it enables. What a source returns is added to the registry, so it is fetched once.
 */
export interface Source {
  /**
   * The entity a URI addresses: a type by its typename DXN, a keyed entity (a skill, an operation) by its key DXN.
   * Undefined when the source does not know it.
   */
  resolve(uri: URI.URI): Promise<Entity.Unknown | undefined>;

  /**
   * The entities a query that names no key selects, e.g. every type for `Filter.type(Type.Type)`. A source that cannot
   * enumerate omits it, and only keyed lookups reach it.
   */
  query?(query: Query.Any): Promise<readonly Entity.Unknown[]>;
}

/**
 * Type guard for {@link Registry}.
 *
 * @performance O(1) brand check; no allocation.
 */
export const isRegistry = (obj: unknown): obj is Registry =>
  obj != null && typeof obj === 'object' && TypeId in obj && (obj as { [TypeId]?: unknown })[TypeId] === TypeId;

/**
 * Options for the registry factory (`makeRegistry` in `@dxos/echo-client`).
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
export class Service extends Context.Service<Service, Registry>()('@dxos/echo/Registry/Service') {}

/**
 * Executes a query against the registry and returns the results.
 * Analogous to {@link Database.query} `.run` for the in-process registry.
 *
 * @performance O(n · filter size) linear scan of the registry.
 */
export const runQuery: {
  <Q extends Query.Any>(query: Q): Effect.Effect<Query.Type<Q>[], never, Service>;
  <F extends Filter.Any>(filter: F): Effect.Effect<Filter.Type<F>[], never, Service>;
} = (queryOrFilter: Query.Any | Filter.Any) =>
  Effect.gen(function* () {
    const registry = yield* Service;
    return (yield* Effect.promise(() => registry.query(queryOrFilter as any).run())) as any;
  });

//
// Atoms
//

/**
 * Reactive lookup of the type entity registered under `typename`, or `undefined` while unregistered.
 * Memoized per (registry, typename), so consumers share one atom and one `changed` subscription.
 *
 * Registration is asynchronous, so anything deriving display state from a schema must read it here
 * rather than through a plain lookup, which freezes at whatever was registered on first evaluation.
 *
 * @example `const type = get(Registry.typeAtom(db.graph.registry, typename));`
 *
 * @performance O(1) memoized atom-family lookup, but rescans `list()` in O(n) on every registry change.
 */
export const typeAtom = registryAtoms.makeTypeAtom;
