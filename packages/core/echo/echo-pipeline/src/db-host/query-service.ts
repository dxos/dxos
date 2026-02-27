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
import type { Echo } from '@dxos/protocols';
import { type Empty, EmptySchema, create } from '@dxos/protocols/buf';
import { type IndexConfig } from '@dxos/protocols/buf/dxos/echo/indexing_pb';
import {
  type QueryRequest,
  type QueryResponse,
  QueryResponseSchema,
  QueryResultSchema,
} from '@dxos/protocols/buf/dxos/echo/query_pb';
import { trace } from '@dxos/tracing';

import { type AutomergeHost } from '../automerge';
import { QueryExecutor } from '../query';

import type { SpaceStateManager } from './space-state-manager';

export type QueryServiceProps = {
  indexEngine: IndexEngine;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
};

/**
 * Represents an active query (stream and query state connected to that stream).
 */
type ActiveQuery = {
  queryId: string;
  executor: QueryExecutor;
  /**
   * Schedule re-execution of the query if true.
   */
  dirty: boolean;

  open: boolean;

  firstResult: boolean;

  sendResults: (results: QueryResponse) => void;
  onError: (err: Error) => void;

  close: () => Promise<void>;
};

@trace.resource()
export class QueryServiceImpl extends Resource implements Echo.QueryService {
  // TODO(dmaretskyi): We need to implement query deduping. Idle composer has 80 queries with only 10 being unique.
  private readonly _queries = new Set<ActiveQuery>();

  private _updateQueries!: DeferredTask;

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
  }

  override async _open(): Promise<void> {
    this._updateQueries = new DeferredTask(this._ctx, this._executeQueries.bind(this));
  }

  @synchronized
  override async _close(): Promise<void> {
    await this._updateQueries.join();
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  /**
   * @deprecated No longer needed with SQL-based indexing.
   */
  async setConfig(_config: IndexConfig): Promise<Empty> {
    // No-op: SQL indexer doesn't need explicit configuration.
    return create(EmptySchema);
  }

  /**
   * @deprecated No longer needed with SQL-based indexing.
   */
  async reindex(): Promise<Empty> {
    // No-op: SQL indexer handles re-indexing automatically.
    log.warn('reindex() is deprecated and no longer has any effect');
    return create(EmptySchema);
  }

  execQuery(request: QueryRequest): Stream<QueryResponse> {
    return new Stream<QueryResponse>(({ next, close, ctx }) => {
      const queryEntry = this._createQuery(ctx, request, next, close, close);
      scheduleMicroTask(ctx, async () => {
        await queryEntry.executor.open();
        queryEntry.open = true;
        this._updateQueries.schedule();
      });
      return queryEntry.close;
    });
  }

  /**
   * Schedule re-execution of all queries.
   */
  invalidateQueries() {
    for (const query of this._queries) {
      query.dirty = true;
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
    const queryId = request.queryId ?? raise(new Error('query id required'));
    const parsedQuery = QueryAST.Query.pipe(Schema.decodeUnknownSync)(JSON.parse(request.query));
    const queryEntry: ActiveQuery = {
      queryId,
      executor: new QueryExecutor({
        indexEngine: this._params.indexEngine,
        runtime: this._params.runtime,
        automergeHost: this._params.automergeHost,
        queryId,
        query: parsedQuery,
        reactivity: request.reactivity,
        spaceStateManager: this._params.spaceStateManager,
      }),
      dirty: true,
      open: false,
      firstResult: true,
      sendResults: (response) => {
        if (ctx.disposed) {
          return;
        }
        onResults(response);
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

  @trace.span({ showInBrowserTimeline: true })
  private async _executeQueries() {
    // TODO(dmaretskyi): How do we integrate this tracing info into the tracing API.
    const begin = performance.now();
    let count = 0;
    await Promise.all(
      Array.from(this._queries).map(async (query) => {
        if (!query.dirty || !query.open) {
          return;
        }
        count++;

        try {
          const { changed } = await query.executor.execQuery();
          query.dirty = false;
          if (changed || query.firstResult) {
            query.firstResult = false;
            // Convert protobuf.js QueryResult to buf QueryResult.
            const results = query.executor.getResults();
            const bufResults = results.map((r) =>
              create(QueryResultSchema, {
                id: r.id,
                spaceId: r.spaceId,
                documentId: r.documentId,
                queueId: r.queueId,
                queueNamespace: r.queueNamespace,
                rank: r.rank,
                documentJson: r.documentJson,
                documentAutomerge: r.documentAutomerge,
                spaceKey: r.spaceKey ? { data: (r.spaceKey as any).asUint8Array() } : undefined,
              }),
            );
            query.sendResults(create(QueryResponseSchema, { queryId: query.queryId, results: bufResults }));
          }
        } catch (err) {
          log.catch(err);
        }
      }),
    );
    log.verbose('executed queries', { count, duration: performance.now() - begin });
  }
}
