//
// Copyright 2024 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Schema from 'effect/Schema';

import { DeferredTask, scheduleMicroTask, synchronized } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Context, Resource } from '@dxos/context';
import { raise } from '@dxos/debug';
import { QueryAST } from '@dxos/echo-protocol';
import { type RuntimeProvider } from '@dxos/effect';
import { type IndexEngine } from '@dxos/index-core';
import { log } from '@dxos/log';
import {
  type QueryRequest,
  type QueryResponse,
  type QueryResult,
  type QueryService,
} from '@dxos/protocols/proto/dxos/echo/query';
import { trace } from '@dxos/tracing';

import { type AutomergeHost } from '../automerge';
import { QueryExecutor } from '../query';
import { type InvalidationHint, mergeHints } from './invalidation-hint';
import type { SpaceStateManager } from './space-state-manager';

export type QueryServiceProps = {
  indexEngine: IndexEngine;
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

  sendResults: (results: QueryResult[]) => void;
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
};

export class QueryServiceImpl extends Resource implements QueryService {
  // TODO(dmaretskyi): We need to implement query deduping. Idle composer has 80 queries with only 10 being unique.
  private readonly _queries = new Set<ActiveQuery>();

  private _updateQueries!: DeferredTask;

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
  };

  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  constructor(private readonly _params: QueryServiceProps) {
    super();

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

  override async _open(): Promise<void> {
    this._updateQueries = new DeferredTask(this._ctx, () => this._executeQueries(this._ctx));
  }

  @synchronized
  override async _close(): Promise<void> {
    await this._updateQueries.join();
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  /**
   * @deprecated No longer needed with SQL-based indexing.
   */
  async setConfig(): Promise<void> {
    // No-op: SQL indexer doesn't need explicit configuration.
  }

  /**
   * @deprecated No longer needed with SQL-based indexing.
   */
  async reindex(): Promise<void> {
    // No-op: SQL indexer handles re-indexing automatically.
    log.warn('reindex() is deprecated and no longer has any effect');
  }

  execQuery(request: QueryRequest): Stream<QueryResponse> {
    return new Stream<QueryResponse>(({ next, close, ctx }) => {
      const queryEntry = this._createQuery(ctx, request, next, close, close);
      scheduleMicroTask(ctx, async () => {
        await queryEntry.executor.open();
        if (queryEntry.feedScoped) {
          await this._params.updateIndexes();
        }
        queryEntry.open = true;
        this._updateQueries.schedule();
      });
      return queryEntry.close;
    });
  }

  /**
   * Schedule re-execution of queries, optionally guided by a targeted hint.
   * When called without a hint, all queries are marked dirty (catch-all invalidation).
   */
  invalidateQueries(hint?: InvalidationHint): void {
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

  private _createQuery(
    ctx: Context,
    request: QueryRequest,
    onResults: (respose: QueryResponse) => void,
    onError: (err: Error) => void,
    onClose: () => void,
  ): ActiveQuery {
    const parsedQuery = QueryAST.Query.pipe(Schema.decodeUnknownSync)(JSON.parse(request.query));
    const queryEntry: ActiveQuery = {
      executor: new QueryExecutor({
        indexEngine: this._params.indexEngine,
        runtime: this._params.runtime,
        automergeHost: this._params.automergeHost,
        queryId: request.queryId ?? raise(new Error('query id required')),
        query: parsedQuery,
        reactivity: request.reactivity,
        spaceStateManager: this._params.spaceStateManager,
      }),
      dirty: true,
      open: false,
      firstResult: true,
      feedScoped: queryHasFeedScope(parsedQuery),
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
  private async _executeQueries(_ctx: Context) {
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

    const begin = performance.now();
    let dirtyCount = 0;
    const activeCount = this._queries.size;
    await Promise.all(
      Array.from(this._queries).map(async (query) => {
        if (!query.dirty || !query.open) {
          return;
        }
        dirtyCount++;

        try {
          const { changed } = await query.executor.execQuery();
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
      }),
    );

    this.#stats.totalExecutionBatches++;
    this.#stats.totalDirtyQueriesExecuted += dirtyCount;
    this.#stats.averageDirtyPerBatch = this.#stats.totalDirtyQueriesExecuted / this.#stats.totalExecutionBatches;
    this.#stats.averageQueriesActive =
      (this.#stats.averageQueriesActive * (this.#stats.totalExecutionBatches - 1) + activeCount) /
      this.#stats.totalExecutionBatches;

    log.verbose('executed queries', { dirty: dirtyCount, active: activeCount, duration: performance.now() - begin });
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
