//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Event, type ReadOnlyEvent } from '@dxos/async';
import { Entity, type Obj, type Query, type QueryResult, Type } from '@dxos/echo';
import { filterMatchObjectJSON } from '@dxos/echo-pipeline/filter';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

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

  /**
   * Run an ECHO query against the registry.
   * Local objects are matched first; upstream results fill in the rest.
   */
  query<T>(query: Query.Query<T>): QueryResult.QueryResult<T>;

  // ---------------------------------------------------------------------------
  // Static schema types (Type.AnyEntity)
  //
  // Schema types are TypeScript class definitions annotated with ECHO metadata.
  // They are keyed by their DXN ("dxn:type:<typename>:<version>") rather than
  // an object id and are NOT surfaced through list() or query() — they exist
  // solely for schema-resolution lookups (replacing RuntimeSchemaRegistry).
  // ---------------------------------------------------------------------------

  /**
   * Register static TypeScript schema types.
   * Existing entries with the same DXN are replaced.
   * Fires {@link changed}.
   */
  addTypes(types: readonly Type.AnyEntity[]): void;

  /**
   * Look up a registered schema type by its DXN string.
   * Falls back to the upstream registry if not found locally.
   */
  getTypeByDXN(dxn: string): Type.AnyEntity | undefined;

  /**
   * All locally-registered schema types.
   * Does not include upstream types.
   */
  readonly types: readonly Type.AnyEntity[];
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
 * Create a new {@link Registry}.
 */
export const make = (options: Options = {}): Registry => new RegistryImpl(options);

/**
 * Effect Context tag for {@link Registry}.
 * Use this to inject a registry into Effect-based code.
 */
export class Service extends Context.Tag('@dxos/echo-registry/Service')<Service, Registry>() {}

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
export const layerWithUpstream = (options: Omit<Options, 'upstream'> = {}): Layer.Layer<Service, never, Service> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const upstream = yield* Service;
      return make({ ...options, upstream });
    }),
  );

//
// Implementation
//

class RegistryImpl implements Registry {
  readonly #changed = new Event<void>();
  readonly #objects: Map<string, Obj.Unknown> = new Map();
  readonly #types: Map<string, Type.AnyEntity> = new Map();
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

  get local(): readonly Obj.Unknown[] {
    return Array.from(this.#objects.values());
  }

  add(objects: readonly Obj.Unknown[]): void {
    for (const object of objects) {
      this.#put(object);
    }
    this.#changed.emit();
  }

  remove(id: string): boolean {
    const removed = this.#objects.delete(id);
    if (removed) {
      this.#changed.emit();
    }
    return removed;
  }

  clear(): void {
    this.#objects.clear();
    this.#changed.emit();
  }

  get(id: string): Obj.Unknown | undefined {
    return this.#objects.get(id) ?? this.#upstream?.get(id);
  }

  list(): Obj.Unknown[] {
    if (!this.#upstream) {
      return Array.from(this.#objects.values());
    }
    const out = new Map<string, Obj.Unknown>();
    for (const object of this.#upstream.list()) {
      out.set(getId(object), object);
    }
    for (const [id, object] of this.#objects) {
      out.set(id, object);
    }
    return Array.from(out.values());
  }

  query<T>(query: Query.Query<T>): QueryResult.QueryResult<T> {
    return new RegistryQueryResult<T>(this, query);
  }

  addTypes(types: readonly Type.AnyEntity[]): void {
    for (const schema of types) {
      const dxn = getTypeDXN(schema);
      this.#types.set(dxn, schema);
    }
    this.#changed.emit();
  }

  getTypeByDXN(dxn: string): Type.AnyEntity | undefined {
    return this.#types.get(normalizeDXN(dxn)) ?? this.#upstream?.getTypeByDXN(dxn);
  }

  get types(): readonly Type.AnyEntity[] {
    return Array.from(this.#types.values());
  }

  #put(object: Obj.Unknown): void {
    const id = getId(object);
    invariant(typeof id === 'string' && id.length > 0, 'Object must have an id');
    this.#objects.set(id, object);
  }
}

const getId = (object: Obj.Unknown): string => {
  const id = (object as { id?: unknown }).id;
  invariant(typeof id === 'string', 'Object must have a string id');
  return id;
};

/**
 * Returns the canonical DXN string key for a schema type.
 * Format: "dxn:type:<typename>:<version>".
 */
const getTypeDXN = (schema: Type.AnyEntity): string => {
  const typename = Type.getTypename(schema);
  const version = Type.getVersion(schema);
  invariant(typename, 'Schema type must have a typename');
  invariant(version, 'Schema type must have a version');
  return `dxn:type:${typename}:${version}`;
};

/**
 * Normalizes a DXN string to the canonical "dxn:type:<typename>:<version>" form.
 * Accepts both the full form and the short "typename:version" form.
 */
const normalizeDXN = (dxn: string): string => {
  if (dxn.startsWith('dxn:')) {
    return dxn;
  }
  // Legacy short form: "typename:version" — prefix with "dxn:type:".
  const lastColon = dxn.lastIndexOf(':');
  if (lastColon === -1) {
    return `dxn:type:${dxn}:`;
  }
  const typename = dxn.slice(0, lastColon);
  const version = dxn.slice(lastColon + 1);
  return `dxn:type:${typename}:${version}`;
};

/**
 * Executes a {@link Query.Query} against a {@link Registry}.
 *
 * Only AST nodes that can be evaluated locally against an in-memory object collection are supported:
 * - `select` clauses applied to plain {@link QueryAST.Filter} nodes (object, key, tag, props, etc.).
 * - Boolean combinators (`and`, `or`, `not`).
 * - `limit` clauses.
 *
 * Server-side concerns such as `from`, `order`, traversal, and text/timestamp filters are not supported.
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
      (object): QueryResult.Entry<T> => ({
        id: getId(object),
        result: object as unknown as T,
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

const executeQuery = (registry: Registry, ast: QueryAST.Query): Obj.Unknown[] => {
  switch (ast.type) {
    case 'select':
      return registry.list().filter((object) => matchFilter(ast.filter, object));
    case 'filter': {
      const selection = executeQuery(registry, ast.selection);
      return selection.filter((object) => matchFilter(ast.filter, object));
    }
    case 'limit': {
      const inner = executeQuery(registry, ast.query);
      return inner.slice(0, ast.limit);
    }
    default:
      throw new Error(`Query clause not supported: ${(ast as { type: string }).type}`);
  }
};

const matchFilter = (filter: QueryAST.Filter, object: Obj.Unknown): boolean => {
  return filterMatchObjectJSON(filter, Entity.toJSON(object) as any);
};
