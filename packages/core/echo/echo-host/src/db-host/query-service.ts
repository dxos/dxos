//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as SqlClient from 'effect/sql/SqlClient';
import * as EffectStream from 'effect/Stream';

import { DeferredTask, scheduleMicroTask, scheduleTask, synchronized } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { raise } from '@dxos/debug';
import { QueryAST } from '@dxos/echo-protocol';
import { EffectEx } from '@dxos/effect';
import { type RuntimeProvider } from '@dxos/effect';
import { type IndexEngine } from '@dxos/index-core';
import { log } from '@dxos/log';
import { QueryService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';

import { type AutomergeHost } from '../automerge/index.ts';
import { type ExecutionTrace, QueryExecutor, type QueryExecutorMode } from '../query/index.ts';
import { type InvalidationHint, mergeHints } from './invalidation-hint.ts';
import type { SpaceStateManager } from './space-state-manager.ts';

export type QueryServiceProps = {
  /** Read on each query: the host builds its engine when it opens, after this service is constructed. */
  indexEngine: () => IndexEngine;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
  /**
   * Brings the index up to date and resolves once done. Awaited before a feed-scoped query's first
   * execution so that a query issued right after a feed append reads the just-written items instead
   * of racing the host's deferred indexing task. Feed reads have no client-side working-set
   * fallback, so the index is their only source of truth.
   */
  updateIndexes: () => Promise<void>;

  /**
   * True once every indexed object has a snapshot. The compiled executor reads that store rather
   * than loading documents, so while it is still filling after upgrade a query awaits indexing
   * before its first execution. Ignored on the in-memory path, which loads documents itself.
   */
  hasCompleteSnapshots?: () => Promise<boolean>;

  /** Evaluation path for every query this service creates; see {@link QueryExecutorMode}. */
  executor?: QueryExecutorMode;
  /** Resolved lazily, like `indexEngine`: the client exists only once the host is open. */
  sql: () => SqlClient.SqlClient;

  /** Overrides {@link DEFAULT_QUERY_DEBOUNCE}. */
  debounce?: Partial<QueryDebounceOptions>;
};

/**
 * How long a live query waits before re-running, in proportion to what its last run cost, so one
 * heavy query re-executing on every write cannot starve the cheap queries and writes sharing its worker.
 */
export type QueryDebounceOptions = {
  /** Debounce window per millisecond of the last run: at 4 a query spends at most a fifth of the time running. */
  factor: number;
  /** Queries whose last run was cheaper than this (ms) re-run as soon as they are invalidated. */
  minCost: number;
  /** Ceiling on a debounce window (ms), so a very slow query still refreshes. */
  maxDelay: number;
  /** Cost (ms) charged for a run; defaults to its wall-clock time, which tests replace to be deterministic. */
  cost?: (query: QueryAST.Query, measured: number) => number;
};

export const DEFAULT_QUERY_DEBOUNCE: QueryDebounceOptions = {
  factor: 4,
  minCost: 16,
  maxDelay: 5_000,
};

/**
 * Represents an active query (stream and query state connected to that stream).
 */
type ActiveQuery = {
  executor: QueryExecutor;
  /**
   * Schedule re-execution of the query if true.
   */
  dirty: boolean;

  open: boolean;

  firstResult: boolean;

  /** Query reads from at least one feed scope, so its first result must await indexing. */
  feedScoped: boolean;

  /** Cost (ms) of the last run; 0 until the query has run. */
  cost: number;

  /** `performance.now()` before which an invalidated query is left dirty rather than re-run. */
  debouncedUntil: number;

  sendResults: (results: QueryService.QueryResult[]) => void;
  onError: (err: Error) => void;

  close: () => Promise<void>;
};

type QueryInvalidationStats = {
  totalInvalidations: number;
  catchAllInvalidations: number;
  hintedInvalidations: number;
  totalDirtyQueriesExecuted: number;
  totalExecutionBatches: number;
  averageDirtyPerBatch: number;
  averageQueriesActive: number;
  /** Times a dirty query was left for a later batch because its debounce window was still open. */
  totalDebounced: number;
};

export class QueryServiceImpl extends Resource implements QueryService.Handlers {
  // TODO(dmaretskyi): We need to implement query deduping. Idle composer has 80 queries with only 10 being unique.
  private readonly '_queries' = new Set<ActiveQuery>();

  private '_updateQueries'!: DeferredTask;

  /** Reactive queries currently registered, across every space. */
  get 'activeQueryCount'(): number {
    return this._queries.size;
  }

  'getQueryTraces'(): ExecutionTrace[] {
    return Array.from(this._queries, (query) => query.executor.trace);
  }

  /** Cached once true: the store only ever finishes filling, so the check need not repeat. */
  #snapshotsKnownComplete = false;

  async #snapshotsComplete(): Promise<boolean> {
    if (this.#snapshotsKnownComplete || !this._params.hasCompleteSnapshots) {
      return true;
    }
    this.#snapshotsKnownComplete = await this._params.hasCompleteSnapshots();
    return this.#snapshotsKnownComplete;
  }

  // 'all' = catch-all; null = no pending hint.
  #pendingHint: InvalidationHint | 'all' | null = null;

  // Diagnostic counters.
  #stats: QueryInvalidationStats = {
    totalInvalidations: 0,
    catchAllInvalidations: 0,
    hintedInvalidations: 0,
    totalDirtyQueriesExecuted: 0,
    totalExecutionBatches: 0,
    averageDirtyPerBatch: 0,
    averageQueriesActive: 0,
    totalDebounced: 0,
  };

  readonly #debounce: QueryDebounceOptions;

  /** Set by {@link awaitQueryUpdates}: the next batch runs debounced queries too. */
  #flushDebounced = false;

  /** Owns the wake-up for the earliest debounce window; disposed to cancel it. */
  #wakeCtx: Context | undefined;
  #wakeAt = Infinity;

  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  'constructor'(private readonly _params: QueryServiceProps) {
    super();
    this.#debounce = { ...DEFAULT_QUERY_DEBOUNCE, ..._params.debounce };

    trace.diagnostic({
      id: 'active-queries',
      name: 'Active Queries',
      fetch: () => {
        return Array.from(this._queries).map((query) => {
          return {
            query: JSON.stringify(query.executor.query),
            plan: JSON.stringify(query.executor.plan),
            trace: JSON.stringify(query.executor.trace),
          };
        });
      },
    });

    trace.diagnostic<QueryInvalidationStats>({
      id: 'query-invalidation',
      name: 'Query Invalidation',
      fetch: async () => ({ ...this.#stats }),
    });
  }

  override async '_open'(): Promise<void> {
    this._updateQueries = new DeferredTask(this._ctx, () => this._executeQueries(this._ctx));
  }

  @synchronized
  override async '_close'(): Promise<void> {
    this.#clearWake();
    await this._updateQueries.join();
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  /**
   * @deprecated No longer needed with SQL-based indexing.
   */
  ['QueryService.setConfig'](_request: QueryService.IndexConfig): Effect.Effect<void, Error> {
    // No-op: SQL indexer doesn't need explicit configuration.
    return Effect.void;
  }

  /**
   * @deprecated No longer needed with SQL-based indexing.
   */
  ['QueryService.reindex'](): Effect.Effect<void, Error> {
    // No-op: SQL indexer handles re-indexing automatically.
    return Effect.sync(() => log.warn('reindex() is deprecated and no longer has any effect'));
  }

  ['QueryService.execQuery'](
    request: QueryService.QueryRequest,
  ): EffectStream.Stream<QueryService.QueryResponse, Error> {
    return EffectEx.streamFromEmitter<QueryService.QueryResponse, Error>((emit) => {
      const ctx = Context.default();
      const queryEntry = this._createQuery(
        ctx,
        request,
        (response) => void emit.single(response),
        (err) => void emit.fail(err),
        () => void emit.end(),
      );
      scheduleMicroTask(ctx, async () => {
        await queryEntry.executor.open();
        const readsSnapshotStore = queryEntry.executor.compiled;
        if (queryEntry.feedScoped || (readsSnapshotStore && !(await this.#snapshotsComplete()))) {
          await this._params.updateIndexes();
        }
        queryEntry.open = true;
        this._updateQueries.schedule();
      });
      return Effect.promise(async () => {
        await queryEntry.close();
        await ctx.dispose();
      });
    });
  }

  /**
   * Schedule re-execution of queries, optionally guided by a targeted hint.
   * When called without a hint, all queries are marked dirty (catch-all invalidation).
   */
  'invalidateQueries'(hint?: InvalidationHint): void {
    this.#stats.totalInvalidations++;
    if (!hint) {
      this.#pendingHint = 'all';
      this.#stats.catchAllInvalidations++;
    } else {
      this.#stats.hintedInvalidations++;
      if (this.#pendingHint !== 'all') {
        this.#pendingHint = this.#pendingHint ? mergeHints(this.#pendingHint, hint) : hint;
      }
    }
    this._updateQueries.schedule();
  }

  /**
   * Resolves once every query invalidated so far has re-run and sent its results, so a caller that
   * waited for the index also sees the queries it changed. Debounced queries run now rather than
   * when their window closes.
   */
  async 'awaitQueryUpdates'(): Promise<void> {
    await this._updateQueries.join();
    const pending =
      this._updateQueries.scheduled ||
      this.#pendingHint !== null ||
      Array.from(this._queries).some((query) => query.open && query.dirty);
    if (pending) {
      this.#flushDebounced = true;
      await this._updateQueries.runBlocking();
    }
  }

  private '_createQuery'(
    ctx: Context,
    request: QueryService.QueryRequest,
    onResults: (respose: QueryService.QueryResponse) => void,
    onError: (err: Error) => void,
    onClose: () => void,
  ): ActiveQuery {
    const parsedQuery = QueryAST.Query.pipe(Schema.decodeUnknownSync)(JSON.parse(request.query));
    const queryEntry: ActiveQuery = {
      executor: new QueryExecutor({
        indexEngine: this._params.indexEngine(),
        runtime: this._params.runtime,
        automergeHost: this._params.automergeHost,
        queryId: request.queryId ?? raise(new Error('query id required')),
        query: parsedQuery,
        reactivity: request.reactivity,
        executor: this._params.executor,
        sql: this._params.sql(),
        spaceStateManager: this._params.spaceStateManager,
      }),
      dirty: true,
      open: false,
      firstResult: true,
      feedScoped: queryHasFeedScope(parsedQuery),
      cost: 0,
      debouncedUntil: 0,
      sendResults: (results) => {
        if (ctx.disposed) {
          return;
        }
        onResults({ queryId: request.queryId, results });
      },
      onError,
      close: async () => {
        onClose();
        await queryEntry.executor.close();
        this._queries.delete(queryEntry);
      },
    };
    this._queries.add(queryEntry);
    return queryEntry;
  }

  @trace.span({ showInBrowserTimeline: true, showInRemoteTracing: false })
  private async '_executeQueries'(_ctx: Context) {
    const hint = this.#pendingHint;
    this.#pendingHint = null;

    // Apply hint to determine which queries need re-execution.
    for (const query of this._queries) {
      if (!query.open) {
        continue;
      }
      if (query.firstResult) {
        // First run is always executed regardless of hint.
        query.dirty = true;
        continue;
      }
      if (hint === 'all') {
        query.dirty = true;
        continue;
      }
      if (hint && query.executor.matchesHint(hint)) {
        query.dirty = true;
      }
    }

    const flush = this.#flushDebounced;
    this.#flushDebounced = false;

    const begin = performance.now();
    const activeCount = this._queries.size;
    const ready: ActiveQuery[] = [];
    const deferred: ActiveQuery[] = [];
    for (const query of this._queries) {
      if (!query.dirty || !query.open) {
        continue;
      }
      if (!flush && !query.firstResult && query.debouncedUntil > begin) {
        deferred.push(query);
      } else {
        ready.push(query);
      }
    }
    this.#stats.totalDebounced += deferred.length;

    // Cheap queries finish before expensive ones start: the worker serializes statements, so running
    // them together would delay the cheap results and charge the expensive run's time to them.
    ready.sort((left, right) => left.cost - right.cost);
    const cheap = ready.filter((query) => query.cost < this.#debounce.minCost);
    const expensive = ready.filter((query) => query.cost >= this.#debounce.minCost);
    await Promise.all(cheap.map((query) => this.#runQuery(query)));
    await Promise.all(expensive.map((query) => this.#runQuery(query)));
    const dirtyCount = ready.length;

    this.#scheduleWake(deferred);

    this.#stats.totalExecutionBatches++;
    this.#stats.totalDirtyQueriesExecuted += dirtyCount;
    this.#stats.averageDirtyPerBatch = this.#stats.totalDirtyQueriesExecuted / this.#stats.totalExecutionBatches;
    this.#stats.averageQueriesActive =
      (this.#stats.averageQueriesActive * (this.#stats.totalExecutionBatches - 1) + activeCount) /
      this.#stats.totalExecutionBatches;

    log.verbose('executed queries', { dirty: dirtyCount, active: activeCount, duration: performance.now() - begin });
  }

  async #runQuery(query: ActiveQuery): Promise<void> {
    try {
      const begin = performance.now();
      const { changed } = await query.executor.execQuery();
      const finishedAt = performance.now();
      query.cost = this.#debounce.cost?.(query.executor.query, finishedAt - begin) ?? finishedAt - begin;
      query.debouncedUntil =
        query.cost < this.#debounce.minCost
          ? 0
          : finishedAt + Math.min(this.#debounce.factor * query.cost, this.#debounce.maxDelay);
      query.dirty = false;
      if (changed || query.firstResult) {
        query.firstResult = false;
        query.sendResults(query.executor.getResults());
      }
    } catch (err) {
      log.catch(err, {
        queryId: query.executor.queryId,
        query: JSON.stringify(query.executor.query),
      });
      query.onError(err as Error);
    }
  }

  /** Arms a wake-up for the earliest deferred query, so its pending invalidation is not lost. */
  #scheduleWake(deferred: ActiveQuery[]): void {
    let wakeAt = Infinity;
    for (const query of deferred) {
      if (query.open && query.dirty) {
        wakeAt = Math.min(wakeAt, query.debouncedUntil);
      }
    }
    if (wakeAt === Infinity || wakeAt >= this.#wakeAt || this._ctx.disposed) {
      return;
    }
    this.#clearWake();
    this.#wakeAt = wakeAt;
    const wakeCtx = this._ctx.derive();
    this.#wakeCtx = wakeCtx;
    scheduleTask(
      wakeCtx,
      () => {
        this.#clearWake();
        this._updateQueries.schedule();
      },
      Math.max(0, wakeAt - performance.now()),
    );
  }

  #clearWake(): void {
    void this.#wakeCtx?.dispose();
    this.#wakeCtx = undefined;
    this.#wakeAt = Infinity;
  }
}

/**
 * True when the query's `from` clause carries at least one feed scope (`Scope.feed(...)`).
 */
const queryHasFeedScope = (query: QueryAST.Query): boolean => {
  let found = false;
  QueryAST.visit(query, (node) => {
    if (node.type === 'from' && node.from._tag === 'scope' && node.from.scopes.some((scope) => scope._tag === 'feed')) {
      found = true;
    }
  });
  return found;
};
