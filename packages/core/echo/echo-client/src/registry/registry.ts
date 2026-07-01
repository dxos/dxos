//
// Copyright 2026 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { type Database, Entity, type Filter, Query, type QueryResult, Registry, Type } from '@dxos/echo';
import { filterMatchEntity } from '@dxos/echo-host/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EID, EntityId, PublicKey, URI } from '@dxos/keys';

import { QueryResultCache } from '../query';

/**
 * Concrete implementation of the {@link Registry.Registry} interface.
 *
 * All entities (objects, relations, and type-definition entities) are stored in the primary
 * `#entitiesById` map keyed by their (bare) entity id. They are additionally indexed in the
 * secondary `#entitiesByUri` map under every URI that addresses them — a type entity by its
 * typename DXN (or, when persisted, its identifier EID), and a keyed entity (one carrying a
 * `key` in its meta — e.g. operations, skills) by its `dxn:<key>[:<version>]`. Types and
 * non-type entities are indexed uniformly, so {@link Registry.Registry.getByURI} resolves by URI
 * in O(1) without separate per-kind indexes.
 */
export class RegistryImpl implements Registry.Registry {
  readonly [Registry.TypeId]: typeof Registry.TypeId = Registry.TypeId;
  readonly id = PublicKey.random().toHex();
  readonly #changed = new Event<void>();

  /**
   * Primary index: (bare) entity id → entity. Defines membership and identity.
   */
  readonly #entitiesById: Map<string, Entity.Unknown> = new Map();

  /**
   * Secondary index: addressing URI → entity. A single entity may be reachable under multiple
   * URIs (e.g. a keyed entity under both its versioned and unversioned key DXN, or a persisted
   * type under both its typename DXN and identifier EID).
   */
  readonly #entitiesByUri: Map<URI.URI, Entity.Unknown> = new Map();
  readonly #upstream: Registry.Registry | undefined;

  // Shares one QueryResult instance (and its subscription) across repeated calls with the same
  // serialized query against this registry.
  readonly #queryResultCache = new QueryResultCache();

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
    return Array.from(this.#entitiesById.values());
  }

  add(entities: readonly Entity.Unknown[]): void {
    for (const entity of entities) {
      this.#put(entity);
    }
    this.#changed.emit();
  }

  remove(id: string): boolean {
    const entity = this.#entitiesById.get(id);
    if (entity == null) {
      return false;
    }
    this.#entitiesById.delete(id);
    // Remove any URI index entries that pointed to this entity.
    for (const [uri, indexed] of this.#entitiesByUri) {
      if (indexed === entity) {
        this.#entitiesByUri.delete(uri);
      }
    }
    this.#changed.emit();
    return true;
  }

  clear(): void {
    this.#entitiesById.clear();
    this.#entitiesByUri.clear();
    this.#changed.emit();
  }

  get(id: string): Entity.Unknown | undefined {
    return this.#entitiesById.get(id) ?? this.#upstream?.get(id);
  }

  list(): Entity.Unknown[] {
    if (!this.#upstream) {
      return Array.from(this.#entitiesById.values());
    }
    const out = new Map<string, Entity.Unknown>();
    for (const entity of this.#upstream.list()) {
      out.set(getEntityId(entity), entity);
    }
    for (const [id, entity] of this.#entitiesById) {
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
    return this.#queryResultCache.getOrCreate(normalized, () => new RegistryQueryResult<any>(this, normalized));
  }

  getByURI(uri: string): Entity.Unknown | undefined {
    return this.#entitiesByUri.get(normalizeURI(uri)) ?? this.#upstream?.getByURI(uri);
  }

  #put(entity: Entity.Unknown): void {
    this.#entitiesById.set(getEntityId(entity), entity);

    // Index by every URI that addresses the entity for fast lookup.
    for (const uri of getEntityUris(entity)) {
      this.#entitiesByUri.set(normalizeURI(uri), entity);
    }
  }
}

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
 * Returns the identifier EID (`echo:/<objectId>`) under which a persisted
 * (database-attached) type entity is indexed, or `undefined` for in-memory
 * static type declarations. Used to avoid colliding with static schemas that
 * share the same typename/version.
 */
const getPersistedIdentifierDXN = (type: Type.AnyEntity): string | undefined =>
  Type.getDatabase(type) != null && typeof type.id === 'string'
    ? EID.make({ entityId: EntityId.make(type.id) })
    : undefined;

/**
 * Returns the canonical DXN string key for a type entity.
 * Format: `dxn:<typename>:<version>`.
 */
const getTypeDXN = (type: Type.AnyEntity): DXN.DXN => {
  const typename = Type.getTypename(type);
  const version = Type.getVersion(type);
  invariant(typename, 'Type entity must have a typename');
  invariant(version, 'Type entity must have a version');
  return DXN.make(typename, version);
};

/**
 * Returns the key DXN(s) under which a keyed (non-type) entity is indexed.
 * A keyed entity carries a `key` in its meta (e.g. operations, skills); it is reachable
 * under both its versioned (`dxn:<key>:<version>`) and unversioned (`dxn:<key>`) DXN. Returns
 * an empty array for entities without a meta key (which are reachable by id only).
 */
const getEntityKeyDXNs = (entity: Entity.Unknown): DXN.DXN[] => {
  const meta = Entity.getMeta(entity);
  const key = meta?.key;
  if (!key) {
    return [];
  }
  const version = meta?.version;
  const dxns: DXN.DXN[] = [];
  // `key` may be either a raw nsid (`org.example.function`) or an already-canonical
  // DXN (`dxn:org.example.function`); normalize to the bare nsid for construction.
  const nsid = DXN.isDXN(key) ? key.slice('dxn:'.length) : key;
  const unversioned = DXN.tryMake(`dxn:${nsid}`);
  if (unversioned != null) {
    dxns.push(unversioned);
  }
  if (version != null) {
    const versioned = DXN.tryMake(`dxn:${nsid}:${version}`);
    if (versioned != null) {
      dxns.push(versioned);
    }
  }
  return dxns;
};

/**
 * Returns every URI under which an entity is indexed in `#entitiesByUri`:
 * - a type entity by its identifier EID when persisted (indexed ONLY by identifier to avoid
 *   overwriting static schemas that share a typename/version), otherwise by its typename DXN;
 * - a keyed entity by both its versioned and unversioned key DXN.
 * Returns an empty array for entities addressable by id only.
 */
const getEntityUris = (entity: Entity.Unknown): URI.URI[] => {
  if (Type.isType(entity)) {
    const identifierDXN = getPersistedIdentifierDXN(entity);
    if (identifierDXN != null) {
      return [normalizeURI(identifierDXN)];
    }
    try {
      return [getTypeDXN(entity)];
    } catch {
      return [];
    }
  }
  return getEntityKeyDXNs(entity);
};

/**
 * Normalizes a URI string to the canonical key form used by `#entitiesByUri`.
 * Tries `DXN.tryMake` first (validates the type-DXN grammar); falls back to
 * `EID.tryParse` for echo identifier URIs (`echo:/<objectId>`), and finally
 * passes unrecognized strings through unchanged. Both `DXN` and `EID` are
 * branded URIs, so the result is always a {@link URI.URI} key.
 */
const normalizeURI = (uri: string): URI.URI => DXN.tryMake(uri) ?? EID.tryParse(uri) ?? URI.make(uri);

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

  #atom: Atom.Atom<T[]> | undefined = undefined;

  get atom(): Atom.Atom<T[]> {
    if (!this.#atom) {
      this.#atom = Atom.make((get) => {
        const unsubscribe = this.subscribe(() => {
          get.setSelf(this.runSync());
        });
        get.addFinalizer(unsubscribe);
        return this.runSync();
      });
    }
    return this.#atom;
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

const matchFilter = (filter: QueryAST.Filter, entity: Entity.Unknown): boolean => filterMatchEntity(filter, entity);
