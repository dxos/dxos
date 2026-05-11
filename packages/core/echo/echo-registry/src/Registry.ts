//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Entity, type Obj, type Query, type QueryResult } from '@dxos/echo';
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
 */
export interface Registry {
  /**
   * All locally-stored objects.
   * Does not include upstream objects — use {@link list} for that.
   */
  readonly local: readonly Obj.Unknown[];

  /**
   * Add or replace an object in the local registry.
   * If an object with the same id already exists, it is replaced.
   */
  add(object: Obj.Unknown): void;

  /**
   * Add or replace many objects in the local registry.
   */
  addMany(objects: readonly Obj.Unknown[]): void;

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
  readonly #objects: Map<string, Obj.Unknown> = new Map();
  readonly #upstream: Registry | undefined;

  constructor(options: Options) {
    this.#upstream = options.upstream;
    if (options.initial) {
      for (const object of options.initial) {
        this.#put(object);
      }
    }
  }

  get local(): readonly Obj.Unknown[] {
    return Array.from(this.#objects.values());
  }

  add(object: Obj.Unknown): void {
    this.#put(object);
  }

  addMany(objects: readonly Obj.Unknown[]): void {
    for (const object of objects) {
      this.#put(object);
    }
  }

  remove(id: string): boolean {
    return this.#objects.delete(id);
  }

  clear(): void {
    this.#objects.clear();
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
  constructor(
    private readonly _registry: Registry,
    private readonly _query: Query.Query<T>,
  ) {}

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
    const matches = executeQuery(this._registry, this._query.ast);
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

  subscribe(): () => void {
    // Static in-memory registry — no change notifications.
    return () => {};
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
      throw new Error(`Query clause '${ast.type}' is not supported by the in-memory registry.`);
  }
};

const matchFilter = (filter: QueryAST.Filter, object: Obj.Unknown): boolean => {
  return filterMatchObjectJSON(filter, Entity.toJSON(object) as any);
};
