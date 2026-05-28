//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { type Database, Entity, Query, type Filter, type QueryResult, Registry, Type } from '@dxos/echo';
import { filterMatchObjectJSON } from '@dxos/echo-pipeline';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

/**
 * Concrete implementation of the {@link Registry.Registry} interface.
 *
 * All entities (objects, relations, and type-definition entities) are stored in a
 * single `#entities` map keyed by id. Type entities are additionally indexed by
 * their DXN string(s) in `#typesByDXN` so that {@link findTypeByDXN} can resolve
 * them in O(1) without exposing a type-specific method on the interface.
 */
export class RegistryImpl implements Registry.Registry {
  readonly #changed = new Event<void>();
  readonly #entities: Map<string, Entity.Unknown> = new Map();
  /**
   * Secondary index: DXN string → Type entity.
   * A single entity may be reachable under multiple DXN keys
   * (e.g. both the canonical typename DXN and an identifier DXN).
   */
  readonly #typesByDXN: Map<string, Type.AnyEntity> = new Map();
  readonly #upstream: Registry.Registry | undefined;

  constructor(options: Registry.Options) {
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

  /**
   * Internal DXN lookup used by {@link findTypeByDXN}.
   * Not part of the public {@link Registry.Registry} interface.
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
      const typeEntity = entity;
      const identifierDXN = getPersistedIdentifierDXN(typeEntity);
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
export const findTypeByDXN = (registry: Registry.Registry, dxn: string): Type.AnyEntity | undefined => {
  if (registry instanceof RegistryImpl) {
    return registry._findTypeByDXN(dxn);
  }
  // Fallback: linear scan for non-RegistryImpl implementations.
  const normalized = normalizeDXN(dxn);
  return registry.list().find((e): e is Type.AnyEntity => Type.isType(e) && matchesDXN(e, normalized));
};

/**
 * Create a new {@link Registry.Registry}.
 */
export const makeRegistry = (options: Registry.Options = {}): Registry.Registry => new RegistryImpl(options);

/**
 * Build an Effect Layer providing a {@link Registry.Registry} with the given options.
 */
export const registryLayer = (options: Registry.Options = {}): Layer.Layer<Registry.Service> =>
  Layer.sync(Registry.Service, () => makeRegistry(options));

/**
 * Build an Effect Layer that delegates to an upstream registry from the Effect environment.
 *
 * @example
 * ```ts
 * const localLayer = registryLayerWithUpstream({ initial: [...] });
 * const stack = Layer.provide(localLayer, upstreamLayer);
 * ```
 */
export const registryLayerWithUpstream = (
  options: Omit<Registry.Options, 'upstream'> = {},
): Layer.Layer<Registry.Service, never, Registry.Service> =>
  Layer.effect(
    Registry.Service,
    Effect.gen(function* () {
      const upstream = yield* Registry.Service;
      return makeRegistry({ ...options, upstream });
    }),
  );

const getEntityId = (entity: Entity.Unknown): string => {
  const id = (entity as { id?: unknown }).id;
  invariant(typeof id === 'string', 'Entity must have a string id');
  return id;
};

/**
 * Returns the identifier DXN (`dxn:echo:@:<objectId>`) under which a persisted
 * (database-attached) type entity is indexed, or `undefined` for in-memory
 * static type declarations. Used to avoid colliding with static schemas that
 * share the same typename/version.
 */
const getPersistedIdentifierDXN = (type: Type.AnyEntity): string | undefined =>
  Type.getDatabase(type) != null && typeof type.id === 'string' ? `dxn:echo:@:${type.id}` : undefined;

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
  const identifierDXN = getPersistedIdentifierDXN(type);
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
 * Executes a {@link Query.Query} against a {@link Registry.Registry}.
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
  readonly #registry: Registry.Registry;
  readonly #query: Query.Query<T>;

  constructor(registry: Registry.Registry, query: Query.Query<T>) {
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

const executeQuery = (registry: Registry.Registry, ast: QueryAST.Query): Entity.Unknown[] => {
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
  filterMatchObjectJSON(filter, Entity.toJSON(entity));
