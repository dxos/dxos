//
// Copyright 2026 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type Entity, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';

import {
  type SchemaResolvers,
  assertQueryTypenamesResolvable,
  filterEntriesWithResolvableSchema,
  filterObjectsWithResolvableSchema,
} from './schema-validation';

/**
 * Decorator over a {@link QueryResult} that enforces schema validation semantics:
 * - Throws when the query references typenames that cannot be resolved in either the runtime or
 *   persistent schema registry.
 * - Filters out results whose schema cannot be resolved.
 *
 * Both behaviors are disabled when the query's options clause sets `skipSchemaValidation: true`.
 */
export class SchemaValidatingQueryResult<
  T extends Entity.Unknown = Entity.Unknown,
> implements QueryResult.QueryResult<T> {
  readonly #inner: QueryResult.QueryResult<T>;
  readonly #resolvers: SchemaResolvers;
  readonly #queryAst: QueryAST.Query;
  #typenamesAsserted = false;

  constructor(inner: QueryResult.QueryResult<T>, resolvers: SchemaResolvers, queryAst: QueryAST.Query) {
    this.#inner = inner;
    this.#resolvers = resolvers;
    this.#queryAst = queryAst;
  }

  // Cache the success of the assertion -- once typenames resolve successfully, skip subsequent
  // lookups on this instance. Failures are not cached so transient misses (e.g., late-registered
  // system types during space initialization) eventually succeed.
  #assertTypenames(): void {
    if (this.#typenamesAsserted) return;
    assertQueryTypenamesResolvable(this.#queryAst, this.#resolvers);
    this.#typenamesAsserted = true;
  }

  #filterEntries(entries: QueryResult.Entry<T>[]): QueryResult.Entry<T>[] {
    return filterEntriesWithResolvableSchema(this.#queryAst, entries, this.#resolvers);
  }

  #filterObjects(objects: T[]): T[] {
    return filterObjectsWithResolvableSchema(this.#queryAst, objects, this.#resolvers);
  }

  get entries(): QueryResult.Entry<T>[] {
    this.#assertTypenames();
    return this.#filterEntries(this.#inner.entries);
  }

  get results(): T[] {
    this.#assertTypenames();
    return this.#filterObjects(this.#inner.results);
  }

  async run(opts?: QueryResult.RunOptions): Promise<T[]> {
    this.#assertTypenames();
    return this.#filterObjects(await this.#inner.run(opts));
  }

  async runEntries(opts?: QueryResult.RunOptions): Promise<QueryResult.Entry<T>[]> {
    this.#assertTypenames();
    return this.#filterEntries(await this.#inner.runEntries(opts));
  }

  runSync(): T[] {
    this.#assertTypenames();
    return this.#filterObjects(this.#inner.runSync());
  }

  runSyncEntries(): QueryResult.Entry<T>[] {
    this.#assertTypenames();
    return this.#filterEntries(this.#inner.runSyncEntries());
  }

  async first(opts?: QueryResult.RunOptions): Promise<T> {
    const objects = await this.run(opts);
    if (objects.length === 0) {
      throw new Error('No objects found');
    }
    return objects[0];
  }

  async firstOrUndefined(opts?: QueryResult.RunOptions): Promise<T | undefined> {
    const objects = await this.run(opts);
    return objects.at(0);
  }

  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void, opts?: QueryResult.SubscriptionOptions): CleanupFn {
    this.#assertTypenames();
    if (!callback) {
      return this.#inner.subscribe(undefined, opts);
    }
    return this.#inner.subscribe(() => callback(this), opts);
  }
}
