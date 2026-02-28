//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Stream } from '@dxos/codec-protobuf/stream';
import { QueryAST } from '@dxos/echo-protocol';
import { NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Echo, type EdgeFunctionEnv } from '@dxos/protocols';
import { type Empty, EMPTY, create, encodePublicKey } from '@dxos/protocols/buf';
import { type IndexConfig } from '@dxos/protocols/buf/dxos/echo/indexing_pb';
import {
  type QueryRequest,
  type QueryResponse,
  QueryResponseSchema,
  type QueryResult,
  QueryResultSchema,
} from '@dxos/protocols/buf/dxos/echo/query_pb';

import { queryToDataServiceRequest } from './adapter';
import { copyUint8Array } from './utils';

export class QueryServiceImpl implements Echo.QueryService {
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
          return create(QueryResponseSchema, {
            results: queryResponse.results.map(
              (object): QueryResult =>
                create(QueryResultSchema, {
                  id: object.objectId,
                  spaceId,
                  spaceKey: encodePublicKey(PublicKey.ZERO),
                  documentId: object.document.documentId,
                  rank: 1,
                  documentAutomerge: copyUint8Array(object.document.data),
                }),
            ),
          });
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

  async reindex(): Promise<Empty> {
    throw new NotImplementedError({
      message: 'Reindex is not implemented.',
    });
  }

  async setConfig(_request: IndexConfig): Promise<Empty> {
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
