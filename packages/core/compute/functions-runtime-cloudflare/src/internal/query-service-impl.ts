//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import { QueryRequestSchema } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type QueryService } from '@dxos/protocols/rpc';

export class QueryServiceImpl implements QueryService.Handlers {
  private '_queryCount' = 0;

  'constructor'(
    private readonly _executionContext: EdgeFunctionEnv.TraceContext,
    private readonly _dataService: EdgeFunctionEnv.DataService,
  ) {}

  ['QueryService.execQuery'](
    request: QueryService.QueryRequest,
  ): EffectStream.Stream<QueryService.QueryResponse, Error> {
    log('execQuery', { request });

    return EffectStream.fromEffect(
      Effect.tryPromise({
        try: async () => {
          this._queryCount++;
          log.verbose('begin query', { request });
          using queryResponse = await this._dataService.execQuery(
            this._executionContext,
            create(QueryRequestSchema, request),
          );
          log.verbose('query response', { resultCount: queryResponse.results?.length });
          return structuredClone(queryResponse);
        },
        catch: (error) => {
          log.error('query failed', { err: error });
          return new RuntimeServiceError({
            message: `Query execution failed (queryCount=${this._queryCount})`,
            context: { queryCount: this._queryCount },
            cause: error,
          });
        },
      }),
    );
  }

  ['QueryService.setConfig'](_request: QueryService.IndexConfig): Effect.Effect<void, Error> {
    return Effect.fail(new NotImplementedError({ message: 'SetConfig is not implemented.' }));
  }

  ['QueryService.reindex'](): Effect.Effect<void, Error> {
    return Effect.fail(new NotImplementedError({ message: 'Reindex is not implemented.' }));
  }
}
