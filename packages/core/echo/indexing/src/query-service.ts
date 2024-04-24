//
// Copyright 2024 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { type AutomergeHost } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import {
  type QueryRequest,
  type QueryResponse,
  type QueryService,
  type QueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';

import { type Indexer } from './indexer';
import { QueryState } from './query-state';

export type QueryServiceParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
};

/**
 * Represents an active query (stream and query state connected to that stream).
 */
type ActiveQuery = {
  state: QueryState;
  sendResults: (results: QueryResult[]) => void;
  close: () => Promise<void>;
};

export class QueryServiceImpl extends Resource implements QueryService {
  private readonly _queries = new Set<ActiveQuery>();

  private readonly _updateQueries = new DeferredTask(this._ctx, async () => {
    await Promise.all(
      Array.from(this._queries).map(async (query) => {
        try {
          const { changed } = await query.state.runQuery();
          if (changed) {
            query.sendResults(query.state.getResults());
          }
        } catch (err) {
          log.catch(err);
        }
      }),
    );
  });

  constructor(private readonly _params: QueryServiceParams) {
    super();
  }

  override async _open() {
    this._params.indexer.updated.on(this._ctx, () => this._updateQueries.schedule());
  }

  override async _close() {
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  async setIndexConfig(config: IndexConfig): Promise<void> {
    if (this._params.indexer.initialized) {
      log.warn('Indexer already initialized. Cannot change config.');
      return;
    }
    this._params.indexer.setIndexConfig(config);
    await this._params.indexer.initialize();
  }

  find(request: QueryRequest): Stream<QueryResponse> {
    return new Stream<QueryResponse>(({ next, close, ctx }) => {
      const query: ActiveQuery = {
        state: new QueryState({
          indexer: this._params.indexer,
          automergeHost: this._params.automergeHost,
          request,
        }),
        sendResults: (results) => {
          if (ctx.disposed) {
            return;
          }
          next({ queryId: request.queryId, results });
        },
        close: async () => {
          close();
          await query.state.close();
          this._queries.delete(query);
        },
      };
      this._queries.add(query);

      queueMicrotask(async () => {
        try {
          const { changed } = await query.state.runQuery();
          if (changed) {
            query.sendResults(query.state.getResults());
          }
        } catch (error) {
          log.catch(error);
        }
      });

      return query.close;
    });
  }
}
