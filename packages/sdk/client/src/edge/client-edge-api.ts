//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type Database, type Entity, Filter, type Hypergraph, Query, type QueryResult } from '@dxos/echo';
import { type QueryContext, QueryResultImpl } from '@dxos/echo-db';
import { QueryAST } from '@dxos/echo-protocol';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { QueryReactivity } from '@dxos/protocols/proto/dxos/echo/query';

import { type Client } from '../client';

/**
 * API for EDGE client functionality.
 */
export interface ClientEdgeAPI {
  /**
   * HTTP client for making EDGE requests.
   */
  readonly http: EdgeHttpClient;

  /**
   * Execute a query against EDGE.
   * Only supports one-shot queries (no reactive subscription).
   */
  readonly query: Database.QueryFn;
}

export type ClientEdgeAPIParams = {
  client: Client;
  edgeClient: EdgeHttpClient;
};

/**
 * Creates a ClientEdgeAPI instance.
 */
export const createClientEdgeAPI = ({ client, edgeClient }: ClientEdgeAPIParams): ClientEdgeAPI => {
  const queryFn: Database.QueryFn = <Q extends Query.Any>(
    query: Q | Filter.Any,
  ): QueryResult.QueryResult<Query.Type<Q>> => {
    const normalizedQuery = Filter.is(query) ? Query.select(query) : query;

    const spaceIds = getTargetSpacesForQuery(normalizedQuery.ast);
    invariant(spaceIds.length === 1, 'Edge query must target exactly one space');
    const spaceId = spaceIds[0] as SpaceId;

    const queryContext = new RemoteEdgeQueryContext({
      edgeClient,
      spaceId,
      graph: client.graph,
    });

    return new QueryResultImpl(queryContext as any, normalizedQuery) as QueryResult.QueryResult<Query.Type<Q>>;
  };

  return {
    http: edgeClient,
    query: queryFn,
  };
};

export type RemoteEdgeQueryContextParams = {
  edgeClient: EdgeHttpClient;
  spaceId: SpaceId;
  graph: Hypergraph.Hypergraph;
};

/**
 * Query context for remote EDGE queries.
 * Only supports one-shot queries (no reactive subscription).
 */
export class RemoteEdgeQueryContext<T extends Entity.Unknown = Entity.Unknown> implements QueryContext<any, T> {
  private _query?: QueryAST.Query;

  public readonly changed = new Event<void>();

  constructor(private readonly _params: RemoteEdgeQueryContextParams) {}

  getResults(): QueryResult.EntityEntry<T>[] {
    // Reactive queries are not supported for remote edge queries.
    return [];
  }

  async run(_ctx: Context, query: QueryAST.Query, opts?: QueryResult.RunOptions): Promise<QueryResult.EntityEntry<T>[]> {
    const start = Date.now();

    log('executing edge query', { spaceId: this._params.spaceId, query });

    const response = await this._params.edgeClient.execQuery(this._params.spaceId, {
      query: JSON.stringify(query),
      reactivity: QueryReactivity.ONE_SHOT,
    });

    const results: QueryResult.EntityEntry<T>[] = [];

    for (const result of response.results ?? []) {
      // Parse the object from document JSON if available.
      const object = result.documentJson ? JSON.parse(result.documentJson) : undefined;

      results.push({
        id: result.id,
        result: object as T | undefined,
        match: { rank: result.rank ?? 1 },
        resolution: {
          source: 'remote',
          time: Date.now() - start,
        },
      });
    }

    log('edge query results', { spaceId: this._params.spaceId, count: results.length });

    return results;
  }

  update(query: QueryAST.Query): void {
    this._query = query;
    // Note: We don't emit changed events since reactive queries are not supported.
  }

  start(): void {
    // No-op: Reactive queries are not supported for remote edge queries.
  }

  stop(): void {
    // No-op: Reactive queries are not supported for remote edge queries.
  }
}

/**
 * Lists spaces this query will select from.
 */
const getTargetSpacesForQuery = (query: QueryAST.Query): string[] => {
  const spaces = new Set<string>();

  const visitor = (node: QueryAST.Query) => {
    if (node.type === 'from' && node.from._tag === 'scope') {
      if (node.from.scope.spaceIds) {
        for (const spaceId of node.from.scope.spaceIds) {
          spaces.add(spaceId);
        }
      }
    }
  };
  QueryAST.visit(query, visitor);
  return [...spaces];
};
