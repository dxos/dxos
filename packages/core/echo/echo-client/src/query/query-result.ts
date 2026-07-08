//
// Copyright 2022 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';

import { type CleanupFn, Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { StackTrace } from '@dxos/debug';
import { type Entity, Query, type QueryAST, type QueryResult } from '@dxos/echo';
import { type AggregateValue, GroupBy } from '@dxos/echo-host/query';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { getDeep, isNonNullable } from '@dxos/util';

import { type QueryContext, type SourceEntry } from './query-context';

/**
 * Predicate based query.
 */
export class QueryResultImpl<T extends Entity.Unknown = Entity.Unknown> implements QueryResult.QueryResult<T> {
  private readonly _event = new Event<QueryResult.QueryResult<T>>();
  private readonly _diagnostic: QueryDiagnostic;

  private _isActive = false;
  private _resultCache?: QueryResult.EntityEntry<T>[] = undefined;
  private _objectCache?: T[] = undefined;
  private _subscribers: number = 0;
  private _atom: Atom.Atom<T[]> | undefined = undefined;

  constructor(
    private readonly _queryContext: QueryContext<T>,
    private readonly _query: Query.Query<T>,
  ) {
    this._queryContext.changed.on(() => {
      if (this._recomputeResult()) {
        this._event.emit(this);
      }
    });

    this._queryContext.update(this._query.ast);

    this._diagnostic = {
      isActive: this._isActive,
      filter: JSON.stringify(this._query),
      creationStack: new StackTrace(),
    };
    QUERIES.add(this._diagnostic);

    log('construct', { query: Query.pretty(this._query) });
  }

  get query(): Query.Query<T> {
    return this._query;
  }

  get entries(): QueryResult.EntityEntry<T>[] {
    this._checkQueryIsRunning();
    this._ensureCachePresent();
    return this._resultCache!;
  }

  get results(): T[] {
    this._checkQueryIsRunning();
    this._ensureCachePresent();
    return this._objectCache!;
  }

  /**
   * Execute the query once and return the results.
   * Does not subscribe to updates.
   */
  async run(opts?: { timeout?: number }): Promise<T[]> {
    const filteredResults = await this._queryContext.run(Context.default(), this._query.ast, {
      timeout: opts?.timeout ?? 30_000,
    });
    return this._presentResults(filteredResults).objects;
  }

  /**
   * Execute the query once and return the entries with match metadata.
   * Does not subscribe to updates.
   */
  async runEntries(opts?: { timeout?: number }): Promise<QueryResult.EntityEntry<T>[]> {
    const filteredResults = await this._queryContext.run(Context.default(), this._query.ast, {
      timeout: opts?.timeout ?? 30_000,
    });
    return this._presentResults(filteredResults).entries;
  }

  async first(opts?: { timeout?: number }): Promise<T> {
    const objects = await this.run(opts);
    if (objects.length === 0) {
      throw new Error('No objects found');
    }

    return objects[0];
  }

  async firstOrUndefined(opts?: { timeout?: number }): Promise<T | undefined> {
    const objects = await this.run(opts);
    return objects.at(0);
  }

  /**
   * Runs the query synchronously and returns all results.
   * WARNING: This method will only return the data already cached and may return incomplete results.
   * Use `this.run()` for a complete list of results stored on-disk.
   */
  runSync(): T[] {
    this._ensureCachePresent();
    return this._objectCache!;
  }

  /**
   * Runs the query synchronously and returns all entries with match metadata.
   * WARNING: This method will only return the data already cached and may return incomplete results.
   * Use `this.runEntries()` for a complete list of entries stored on-disk.
   */
  runSyncEntries(): QueryResult.EntityEntry<T>[] {
    this._ensureCachePresent();
    return this._resultCache!;
  }

  /**
   * Subscribe to query results.
   * Updates only when the identity or the order of the objects changes.
   * Does not update when the object properties change.
   */
  // TODO(burdon): Change to SubscriptionHandle (make uniform).
  subscribe(callback?: (query: QueryResult.QueryResult<T>) => void, opts?: QueryResult.SubscriptionOptions): CleanupFn {
    invariant(!(!callback && opts?.fire), 'Cannot fire without a callback.');

    log('subscribe', { query: Query.pretty(this._query), active: this._isActive });
    this._subscribers++;
    const unsubscribeFromEvent = callback ? this._event.on(callback) : undefined;
    this._handleQueryLifecycle();

    const unsubscribe = () => {
      log('unsubscribe', { query: Query.pretty(this._query), active: this._isActive });
      this._subscribers--;
      unsubscribeFromEvent?.();
      this._handleQueryLifecycle();
    };

    // Fire the initial event synchronously when authoritative results are already available: either
    // a source can produce them synchronously, or this (cached/reused) result already computed them
    // during a prior subscription. Only defer when an async-only query has no results yet (e.g. a
    // fresh feed query served by the index), so subscribers don't observe a spurious empty snapshot.
    if (callback && opts?.fire && (this._queryContext.isSynchronous() || this._objectCache !== undefined)) {
      try {
        callback(this);
      } catch (err) {
        unsubscribe();
        throw err;
      }
    }

    return unsubscribe;
  }

  get atom(): Atom.Atom<T[]> {
    if (!this._atom) {
      this._atom = Atom.make((get) => {
        const unsubscribe = this.subscribe(() => {
          get.setSelf(this.runSync());
        });
        get.addFinalizer(unsubscribe);
        return this.runSync();
      });
    }
    return this._atom;
  }

  private _ensureCachePresent(): void {
    if (!this._resultCache) {
      this._recomputeResult();
    }
  }

  /**
   * @returns true if the result cache was updated.
   */
  private _recomputeResult(): boolean {
    // TODO(dmaretskyi): Make results unique too.
    const results = this._queryContext.getResults();
    const presented = this._presentResults(results);

    const changed = presented.grouped
      ? // Same T-is-erased-Group boundary as `_presentResults` — `_objectCache`/`presented.objects`
        // are really `GroupResult[]` here, just typed as `T[]` at this generic class's surface.
        !_groupsEqual(
          this._objectCache as unknown as GroupResult[] | undefined,
          presented.objects as unknown as GroupResult[],
        )
      : !this._objectCache ||
        this._objectCache.length !== presented.objects.length ||
        this._objectCache.some((obj, index) => obj.id !== presented.objects[index].id);

    log('recomputeResult', { changed });

    this._resultCache = presented.entries;
    this._objectCache = presented.objects;
    return changed;
  }

  /**
   * Turns flat, row-level source entries into the query's public result shape. For a `groupBy`
   * query (detected by the internal `SourceEntry.group` annotation, which the query context sets
   * uniformly across all entries or none), assembles `Group` values instead of deduped row objects.
   */
  private _presentResults(entries: SourceEntry<T>[]): {
    objects: T[];
    entries: QueryResult.EntityEntry<T>[];
    grouped: boolean;
  } {
    if (entries.length > 0 && entries[0].group !== undefined) {
      const { groups, entries: groupEntries } = _assembleGroups(entries, _groupAggregatesFromQuery(this._query.ast));
      // Boundary cast: T is `Group<K, Row>` for grouped queries (per Query.groupBy's return type),
      // but this class is written generically over the row type — grouping is a presentation
      // transform applied on top of row-level entries, with K/Row erased at runtime.
      return {
        objects: groups as unknown as T[],
        entries: groupEntries as unknown as QueryResult.EntityEntry<T>[],
        grouped: true,
      };
    }

    return { objects: this._uniqueObjects(entries), entries, grouped: false };
  }

  private _uniqueObjects(entries: SourceEntry<T>[]): T[] {
    const seen = new Set<unknown>();
    return entries
      .map(({ result }) => result)
      .filter(isNonNullable)
      .filter((object: any) => {
        // Assuming objects have `id` property we can use to dedup.
        if (object.id == null) {
          return true;
        }

        if (seen.has(object.id)) {
          return false;
        }

        seen.add(object.id);
        return true;
      });
  }

  private _handleQueryLifecycle(): void {
    if (this._subscribers === 0 && this._isActive) {
      log('stop query', { query: Query.pretty(this._query) });
      this._stop();
    } else if (this._subscribers > 0 && !this._isActive) {
      log('start query', { query: Query.pretty(this._query) });
      this._start();
    }
  }

  private _start(): void {
    this._isActive = true;
    this._queryContext.start();
    this._diagnostic.isActive = true;
  }

  private _stop(): void {
    this._queryContext.stop();
    this._isActive = false;
    this._diagnostic.isActive = false;
  }

  private _checkQueryIsRunning(): void {
    if (!this._isActive) {
      throw new Error(
        'Query must have at least 1 subscriber for `.results` and `.entries` to be used. Use query.run() for single-use result retrieval.',
      );
    }
  }
}

/** Runtime shape of a `Query.Group` value once its `K`/row type parameters are erased. */
type GroupResult = {
  key: Record<string, unknown>;
  count: number;
  aggregates: Record<string, unknown>;
  values: unknown[];
};

/**
 * Buckets flat row-level entries into `Group` values, in the order groups first appear in
 * `entries`. The host/local query sources already deliver a grouped query's entries with groups
 * contiguous and correctly ordered (see `GroupByStep`); this only needs to re-derive that
 * grouping locally, after row objects have deduped/hydrated on the client. Named aggregates are
 * recomputed here from each group's hydrated members (the ordering they drive is already applied by
 * the source); a group with unhydrated members reflects only the hydrated subset, mirroring `values`.
 */
const _assembleGroups = (
  entries: SourceEntry[],
  aggregates: readonly QueryAST.GroupAggregate[],
): { groups: GroupResult[]; entries: QueryResult.Entry<GroupResult>[] } => {
  const seenIds = new Set<unknown>();
  const buckets = new Map<string, GroupResult>();
  const order: string[] = [];

  for (const entry of entries) {
    if (!entry.group) {
      continue;
    }

    const objectId = entry.result?.id;
    if (objectId != null) {
      if (seenIds.has(objectId)) {
        continue;
      }
      seenIds.add(objectId);
    }

    const serializedKey = JSON.stringify(entry.group.key);
    let bucket = buckets.get(serializedKey);
    if (!bucket) {
      bucket = { key: entry.group.key, count: entry.group.count, aggregates: {}, values: [] };
      buckets.set(serializedKey, bucket);
      order.push(serializedKey);
    }
    if (entry.result != null) {
      bucket.values.push(entry.result);
    }
  }

  for (const bucket of buckets.values()) {
    for (const aggregate of aggregates) {
      const values = bucket.values.map(
        // Row objects are erased to `unknown` at this presentation boundary (see the Group cast in
        // `_presentResults`); the aggregate reads a dynamic property path off the hydrated object.
        (value): AggregateValue => _coerceScalar(getDeep(value as Record<string, unknown>, [aggregate.property])),
      );
      bucket.aggregates[aggregate.name] = GroupBy.reduceAggregate(values, aggregate.kind);
    }
  }

  const groups = order.map((key) => buckets.get(key)!);
  const groupEntries = order.map((key, index) => ({ id: key, result: groups[index] }));
  return { groups, entries: groupEntries };
};

/** Coerces a raw property value to the scalar aggregate domain (non-scalars → `null`). */
const _coerceScalar = (value: unknown): AggregateValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;

/**
 * Extracts the group-by clause's aggregate declarations from a query AST, unwrapping the wrappers
 * permitted above a `group-by` (`order`/`limit`/`skip`/`from`/`options`). Empty when the query has
 * no `group-by` or declares no aggregates.
 */
const _groupAggregatesFromQuery = (query: QueryAST.Query): readonly QueryAST.GroupAggregate[] => {
  let node: QueryAST.Query | undefined = query;
  while (node && node.type !== 'group-by' && 'query' in node) {
    node = node.query;
  }
  return node?.type === 'group-by' ? (node.aggregates ?? []) : [];
};

/**
 * Compares two `Group` result sets by key, count, and member object identity (id sequence) —
 * mirrors the row-level id diff used for non-grouped queries.
 */
const _groupsEqual = (prev: GroupResult[] | undefined, next: GroupResult[]): boolean => {
  if (!prev || prev.length !== next.length) {
    return false;
  }
  return prev.every((prevGroup, index) => {
    const nextGroup = next[index];
    return (
      JSON.stringify(prevGroup.key) === JSON.stringify(nextGroup.key) &&
      prevGroup.count === nextGroup.count &&
      prevGroup.values.length === nextGroup.values.length &&
      // `values` is `unknown[]` (row objects erased at the same boundary as the Group cast above);
      // every row object is an Entity with an `id`, so this narrows for the identity comparison.
      prevGroup.values.every(
        (value, valueIndex) => (value as { id: unknown })?.id === (nextGroup.values[valueIndex] as { id: unknown })?.id,
      )
    );
  });
};

// NOTE: Make sure this doesn't keep references to the queries so that they can be garbage collected.
type QueryDiagnostic = {
  isActive: boolean;
  filter: string;
  creationStack: StackTrace;
};

const QUERIES = new Set<QueryDiagnostic>();

trace.diagnostic({
  id: 'client-queries',
  name: 'Queries (Client)',
  fetch: () => {
    return Array.from(QUERIES).map((query) => {
      return {
        isActive: query.isActive,
        filter: query.filter,
        creationStack: query.creationStack.getStack(),
      };
    });
  },
});
