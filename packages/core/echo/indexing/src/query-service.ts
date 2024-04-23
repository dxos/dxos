//
// Copyright 2024 DXOS.org
//

import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { type AutomergeHost } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import { type QueryRequest, type QueryResponse, type QueryService } from '@dxos/protocols/proto/dxos/echo/query';

import { type Indexer } from './indexer';
import { QueryState } from './query-state';

export type QueryServiceParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
};

export class QueryServiceImpl implements QueryService {
  private readonly _ctx = new Context();

  private readonly _queries = new Set<QueryState>();
  constructor(private readonly _params: QueryServiceParams) {}

  async setIndexConfig(config: IndexConfig): Promise<void> {
    if (this._params.indexer.initialized) {
      log.warn('Indexer already initialized. Cannot change config.');
      return;
    }
    this._params.indexer.setIndexConfig(config);
    await this._params.indexer.initialize();
  }

  find(request: QueryRequest): Stream<QueryResponse> {
    const queryState = new QueryState({
      indexer: this._params.indexer,
      automergeHost: this._params.automergeHost,
      onClose: async () => {
        this._queries.delete(queryState);
      },
    });
    this._queries.add(queryState);

    return queryState.createResultsStream(request);
  }

  destroy() {
    void this._ctx.dispose();
  }
}
