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
  constructor(
    private readonly _inner: QueryResult.QueryResult<T>,
    private readonly _resolvers: SchemaResolvers,
    private readonly _queryAst: QueryAST.Query,
  ) {}

  private _assertTypenames(): void {
    assertQueryTypenamesResolvable(this._queryAst, this._resolvers);
  }

  private _filterEntries(entries: QueryResult.Entry<T>[]): QueryResult.Entry<T>[] {
    return filterEntriesWithResolvableSchema(this._queryAst, entries, this._resolvers);
  }

  private _filterObjects(objects: T[]): T[] {
    return filterObjectsWithResolvableSchema(this._queryAst, objects, this._resolvers);
  }

  get entries(): QueryResult.Entry<T>[] {
    this._assertTypenames();
    return this._filterEntries(this._inner.entries);
  }

  get results(): T[] {
    this._assertTypenames();
    return this._filterObjects(this._inner.results);
  }

  async run(opts?: QueryResult.RunOptions): Promise<T[]> {
    this._assertTypenames();
    return this._filterObjects(await this._inner.run(opts));
  }

  async runEntries(opts?: QueryResult.RunOptions): Promise<QueryResult.Entry<T>[]> {
    this._assertTypenames();
    return this._filterEntries(await this._inner.runEntries(opts));
  }

  runSync(): T[] {
    this._assertTypenames();
    return this._filterObjects(this._inner.runSync());
  }

  runSyncEntries(): QueryResult.Entry<T>[] {
    this._assertTypenames();
    return this._filterEntries(this._inner.runSyncEntries());
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
    this._assertTypenames();
    if (!callback) {
      return this._inner.subscribe(undefined, opts);
    }
    return this._inner.subscribe(() => callback(this), opts);
  }
}
