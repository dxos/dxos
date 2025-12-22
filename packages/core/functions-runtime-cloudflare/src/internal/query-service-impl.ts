//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Stream } from '@dxos/codec-protobuf/stream';
import { QueryAST } from '@dxos/echo-protocol';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import {
  type QueryRequest,
  type QueryResponse,
  type QueryResult as QueryResultProto,
  type QueryService as QueryServiceProto,
} from '@dxos/protocols/proto/dxos/echo/query';

import { queryToDataServiceRequest } from './adapter';
import { copyUint8Array } from './utils';

export class QueryServiceImpl implements QueryServiceProto {
  private _queryCount = 0;

  constructor(
    private readonly _executionContext: EdgeFunctionEnv.ExecutionContext,
    private readonly _dataService: EdgeFunctionEnv.DataService,
  ) {}

  execQuery(request: QueryRequest): Stream<QueryResponse> {
    log.info('execQuery', { request });
    const query = QueryAST.Query.pipe(Schema.decodeUnknownSync)(JSON.parse(request.query));
    const requestedSpaceIds = getTargetSpacesForQuery(query);
    invariant(requestedSpaceIds.length === 1, 'Only one space is supported');
    const spaceId = requestedSpaceIds[0];

    return Stream.fromPromise<QueryResponse>(
      (async () => {
        try {
          this._queryCount++;
          log.info('begin query', { spaceId });
          using queryResponse = await this._dataService.queryDocuments(
            this._executionContext,
            queryToDataServiceRequest(query),
          );
          log.info('query response', { spaceId, filter: request.filter, resultCount: queryResponse.results.length });
          return {
            results: queryResponse.results.map(
              (object): QueryResultProto => ({
                id: object.objectId,
                spaceId,
                spaceKey: PublicKey.ZERO,
                documentId: object.document.documentId,
                rank: 0,
                // Ensure we don't leak a disposable Uint8Array from a Workers RPC response.
                documentAutomerge: copyUint8Array(object.document.data),
              }),
            ),
          } satisfies QueryResponse;
        } catch (error) {
          log.error('query failed', { err: error });
          throw new RuntimeServiceError({
            message: `Query execution failed (queryCount=${this._queryCount})`,
            context: { spaceId, filter: request.filter, queryCount: this._queryCount },
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

/**
 * Lists spaces this query will select from.
 */
export const getTargetSpacesForQuery = (query: QueryAST.Query): SpaceId[] => {
  const spaces = new Set<SpaceId>();

  const visitor = (node: QueryAST.Query) => {
    if (node.type === 'options') {
      if (node.options.spaceIds) {
        for (const spaceId of node.options.spaceIds) {
          spaces.add(SpaceId.make(spaceId));
        }
      }
    }
  };
  QueryAST.visit(query, visitor);
  return [...spaces];
};
