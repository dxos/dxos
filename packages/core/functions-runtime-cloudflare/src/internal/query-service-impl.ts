//
// Copyright 2024 DXOS.org
//


import { Stream } from '@dxos/codec-protobuf/stream';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import {
  type QueryRequest,
  type QueryResponse,
  type QueryService,
} from '@dxos/protocols/proto/dxos/echo/query';

export class QueryServiceImpl implements QueryService {
  private _queryCount = 0;

  constructor(
    private readonly _executionContext: EdgeFunctionEnv.TraceContext,
    private readonly _dataService: EdgeFunctionEnv.DataService,
  ) {}

  execQuery(request: QueryRequest): Stream<QueryResponse> {
    log.info('execQuery', { request });

    return Stream.fromPromise<QueryResponse>(
      (async () => {
        try {
          this._queryCount++;
          log.info('begin query', { request });
          using queryResponse = await this._dataService.execQuery(
            this._executionContext,
            request
          );
          log.info('query response', { resultCount: queryResponse.results?.length });
          return structuredClone(queryResponse);
        } catch (error) {
          log.error('query failed', { err: error });
          throw new RuntimeServiceError({
            message: `Query execution failed (queryCount=${this._queryCount})`,
            context: { queryCount: this._queryCount },
            cause: error,
          });
        }
      })(),
    );
  }

  async reindex() {
    throw new NotImplementedError({
      message: 'Reindex is not implemented.',
    });
  }

  async setConfig() {
    throw new NotImplementedError({
      message: 'SetConfig is not implemented.',
    });
  }
}
