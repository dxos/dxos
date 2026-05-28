// Copyright 2026 DXOS.org

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import type * as Database from './Database';
import * as Entity from './Entity';
import type * as Filter from './Filter';
import { filterMatchObjectJSON } from './internal/filter';
import * as Query from './Query';
import type * as QueryResult from './QueryResult';
import type * as SchemaRegistry from './SchemaRegistry';
import * as Type from './Type';

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

/**
 * Concrete implementation of the {@link Registry} interface.
 *
 * All entities (objects, relations, and type-definition entities) are stored in a
 * single `#entities` map keyed by id. Type entities are additionally indexed by
 * their DXN string(s) in `#typesByDXN` so that {@link findTypeByDXN} can resolve
 * them in O(1) without exposing a type-specific method on the interface.
 */
export class RegistryImpl implements Registry {
  readonly #changed = new Event<void>();
  readonly #entities: Map<string, Entity.Unknown> = new Map();
  /**
   * Secondary index: DXN string → Type entity.
   * A single entity may be reachable under multiple DXN keys
   * (e.g. both the canonical typename DXN and an identifier DXN).
   */
  readonly #typesByDXN: Map<string, Type.AnyEntity> = new Map();
  readonly #upstream: Registry | undefined;

  constructor(options: Options) {
    this.#upstream = options.upstream;
    if (options.initial) {
      this.add(options.initial);
    }
  }

  get changed(): ReadOnlyEvent<void> {
    return this.#changed;
  }

  get local(): readonly Entity.Unknown[] {
    return Array.from(this.#entities.values());
  }

  add(entities: readonly Entity.Unknown[]): void {
    for (const entity of entities) {
      this.#put(entity);
    }
    this.#changed.emit();
  }

  remove(id: string): boolean {
    const entity = this.#entities.get(id);
    if (entity == null) {
      return false;
    }
    this.#entities.delete(id);
    // Remove any DXN index entries that pointed to this entity.
    if (Type.isType(entity)) {
      for (const [dxn, indexed] of this.#typesByDXN) {
        if (indexed === entity) {
          this.#typesByDXN.delete(dxn);
        }
      }
    }
    this.#changed.emit();
    return true;
  }

  clear(): void {
    this.#entities.clear();
    this.#typesByDXN.clear();
    this.#changed.emit();
  }

  get(id: string): Entity.Unknown | undefined {
    return this.#entities.get(id) ?? this.#upstream?.get(id);
  }

  list(): Entity.Unknown[] {
    if (!this.#upstream) {
      return Array.from(this.#entities.values());
    }
    const out = new Map<string, Entity.Unknown>();
    for (const entity of this.#upstream.list()) {
      out.set(getEntityId(entity), entity);
    }
    for (const [id, entity] of this.#entities) {
      out.set(id, entity);
    }
    return Array.from(out.values());
  }

  // Method type is taken from the typedef so the overloaded `Database.QueryFn` signature is preserved.
  declare query: Database.QueryFn;
  static {
    this.prototype.query = this.prototype._query;
  }

  private _query(query: Query.Any | Filter.Any): QueryResult.QueryResult<any> {
    const normalized: Query.Any = Query.is(query) ? query : Query.select(query as Filter.Any);
    return new RegistryQueryResult<any>(this, normalized);
  }

  register(_inputs: SchemaRegistry.RegisterSchemaInput[]): Promise<Type.AnyEntity[]> {
    throw new Error('Registry is not bound to a database. Use db.registry.register() instead.');
  }

  /**
   * Internal DXN lookup used by {@link findTypeByDXN}.
   * Not part of the public {@link Registry} interface.
   */
  _findTypeByDXN(dxn: string): Type.AnyEntity | undefined {
    const local = this.#typesByDXN.get(normalizeDXN(dxn));
    if (local != null) {
      return local;
    }
    // Delegate to upstream if it supports fast DXN lookup.
    if (this.#upstream instanceof RegistryImpl) {
      return this.#upstream._findTypeByDXN(dxn);
    }
    // Fallback: linear scan of upstream.
    return this.#upstream?.list().find((e): e is Type.AnyEntity => Type.isType(e) && matchesDXN(e, normalizeDXN(dxn)));
  }

  #put(entity: Entity.Unknown): void {
    const id = getEntityId(entity);
    this.#entities.set(id, entity);

    // Index type entities by DXN(s) for fast lookup.
    if (Type.isType(entity)) {
      const typeEntity = entity as Type.AnyEntity;
      const identifierDXN = Type.getDXN(typeEntity);
      if (identifierDXN != null) {
        // Schema has an identifier DXN (e.g. dxn:echo:@:objectId for PersistentSchema-backed types).
        // Index ONLY by identifier DXN to avoid overwriting static schemas that share the same typename/version.
        this.#typesByDXN.set(normalizeDXN(identifierDXN), typeEntity);
      } else {
        // Static schema (no identifier DXN): index by canonical typename DXN.
        const dxn = getTypeDXN(typeEntity);
        this.#typesByDXN.set(dxn, typeEntity);
      }
    }
  }
}

/**
 * Look up a type entity by its DXN string.
 *
 * Accepts several DXN forms:
 *  - Full DXN:               `dxn:<typename>:<version>`
 *  - Legacy prefixed form:   `dxn:type:<typename>:<version>`
 *  - Short form:             `<typename>:<version>`
 *  - Echo object DXN:        `dxn:echo:@:<objectId>`
 *
 * Falls back to a linear scan when the registry is not a {@link RegistryImpl}.
 */
export const findTypeByDXN = (registry: Registry, dxn: string): Type.AnyEntity | undefined => {
  if (registry instanceof RegistryImpl) {
    return registry._findTypeByDXN(dxn);
  }
  // Fallback: linear scan for non-RegistryImpl implementations.
  const normalized = normalizeDXN(dxn);
  return registry.list().find((e): e is Type.AnyEntity => Type.isType(e) && matchesDXN(e, normalized));
};

/**
 * Create a new {@link Registry}.
 */
export const make = (options: Options = {}): Registry => new RegistryImpl(options);

/**
 * Build an Effect Layer providing a {@link Registry} with the given options.
 */
export const layer = (options: Options = {}): Layer.Layer<Service> => Layer.sync(Service, () => make(options));

/**
 * Build an Effect Layer that delegates to an upstream registry from the Effect environment.
 *
 * @example
 * ```ts
 * const localLayer = Registry.layerWithUpstream({ initial: [...] });
 * const stack = Layer.provide(localLayer, upstreamLayer);
 * ```
 */
export const layerWithUpstream = (
  options: Omit<Options, 'upstream'> = {},
): Layer.Layer<Service, never, Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const upstream = yield* Service;
      return make({ ...options, upstream });
    }),
  );

const getEntityId = (entity: Entity.Unknown): string => {
  const id = (entity as { id?: unknown }).id;
  invariant(typeof id === 'string', 'Entity must have a string id');
  return id;
};

/**
 * Returns the canonical DXN string key for a type entity.
 * Format: `dxn:<typename>:<version>`.
 */
const getTypeDXN = (type: Type.AnyEntity): string => {
  const typename = Type.getTypename(type);
  const version = Type.getVersion(type);
  invariant(typename, 'Type entity must have a typename');
  invariant(version, 'Type entity must have a version');
  return `dxn:${typename}:${version}`;
};

/**
 * Returns true if the type entity's canonical DXN (or identifier DXN) matches the normalized key.
 */
const matchesDXN = (type: Type.AnyEntity, normalizedDXN: string): boolean => {
  const identifierDXN = Type.getDXN(type);
  if (identifierDXN != null && normalizeDXN(identifierDXN) === normalizedDXN) {
    return true;
  }
  try {
    return getTypeDXN(type) === normalizedDXN;
  } catch {
    return false;
  }
};

/**
 * Normalizes a DXN string to the canonical `dxn:<typename>:<version>` form.
 * Accepts:
 *  - Full DXN:             `dxn:<typename>:<version>`
 *  - Legacy prefixed form: `dxn:type:<typename>:<version>` → `dxn:<typename>:<version>`
 *  - Short form:           `<typename>:<version>` → `dxn:<typename>:<version>`
 *  - Echo object DXN:      `dxn:echo:@:<objectId>` — returned as-is
 */
const normalizeDXN = (dxn: string): string => {
  // Strip legacy "dxn:type:" prefix.
  if (dxn.startsWith('dxn:type:')) {
    return `dxn:${dxn.slice('dxn:type:'.length)}`;
  }
  if (dxn.startsWith('dxn:')) {
    return dxn;
  }
  // Legacy short form: "typename:version" — prefix with "dxn:".
  return `dxn:${dxn}`;
};

/**
 * Executes a {@link Query.Query} against a {@link Registry}.
 *
 * Only AST nodes that can be evaluated locally against an in-memory entity collection are supported:
 * - `select` clauses applied to plain {@link QueryAST.Filter} nodes (object, key, tag, props, etc.).
 * - Boolean combinators (`and`, `or`, `not`) within filters.
 * - `limit` clauses.
 * - `from` and `options` clauses — unwrapped; scope is ignored (a direct registry query always
 *   targets the registry's own entities).
 *
 * Server-side concerns such as traversal, ordering, and text/timestamp filters are not supported.
 */
class RegistryQueryResult<T> implements QueryResult.QueryResult<T> {
  readonly #registry: Registry;
  readonly #query: Query.Query<T>;

  constructor(registry: Registry, query: Query.Query<T>) {
    this.#registry = registry;
    this.#query = query;
  }

  get entries(): QueryResult.Entry<T>[] {
    return this.runSyncEntries();
  }

  get results(): T[] {
    return this.runSync();
  }

  run(): Promise<T[]> {
    return Promise.resolve(this.runSync());
  }

  runEntries(): Promise<QueryResult.Entry<T>[]> {
    return Promise.resolve(this.runSyncEntries());
  }

  runSync(): T[] {
    return this.runSyncEntries().map((entry) => entry.result!);
  }

  runSyncEntries(): QueryResult.Entry<T>[] {
    const matches = executeQuery(this.#registry, this.#query.ast);
    return matches.map(
      (entity): QueryResult.Entry<T> => ({
        id: getEntityId(entity),
        result: entity as unknown as T,
        resolution: { source: 'local', time: 0 },
      }),
    );
  }

  async first(): Promise<T> {
    const results = this.runSync();
    invariant(results.length > 0, 'No results');
    return results[0];
  }

  async firstOrUndefined(): Promise<T | undefined> {
    return this.runSync()[0];
  }

  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void): () => void {
    if (!callback) {
      return () => {};
    }
    return this.#registry.changed.on(() => callback(this));
  }
}

const executeQuery = (registry: Registry, ast: QueryAST.Query): Entity.Unknown[] => {
  switch (ast.type) {
    case 'select':
      return registry.list().filter((entity) => matchFilter(ast.filter, entity));
    case 'filter': {
      const selection = executeQuery(registry, ast.selection);
      return selection.filter((entity) => matchFilter(ast.filter, entity));
    }
    case 'limit': {
      const inner = executeQuery(registry, ast.query);
      return inner.slice(0, ast.limit);
    }
    // Scope (`from`) and `options` are unwrapped: a direct registry query ignores scope.
    case 'from':
      return executeQuery(registry, ast.query);
    case 'options':
      return executeQuery(registry, ast.query);
    default:
      throw new Error(`Query clause not supported by registry: ${(ast as { type: string }).type}`);
  }
};

const matchFilter = (filter: QueryAST.Filter, entity: Entity.Unknown): boolean =>
  filterMatchObjectJSON(filter, Entity.toJSON(entity) as any);
