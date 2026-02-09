//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { type Hypergraph, Obj, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, type ObjectId, type QueueSubspaceTag, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, type Echo } from '@dxos/protocols';
import { QueryReactivity } from '@dxos/protocols/proto/dxos/echo/query';
import * as QueryPb from '@dxos/protocols/buf/dxos/echo/query_pb';
import { isNonNullable } from '@dxos/util';

import { OBJECT_DIAGNOSTICS, type QuerySourceProvider } from '../hypergraph';
import { type QuerySource, getTargetSpacesForQuery } from '../query';
import { create } from '@dxos/protocols/buf';

export type LoadObjectProps = {
  spaceId: SpaceId;
  objectId: string;
  documentId: string | undefined;
};

export interface ObjectLoader {
  loadObject(params: LoadObjectProps): Promise<Obj.Obj<any> | undefined>;
}

export type IndexQueryProviderProps = {
  service: Echo.QueryService;
  objectLoader: ObjectLoader;
  graph: Hypergraph.Hypergraph;
};

const QUERY_SERVICE_TIMEOUT = 20_000;

export class IndexQuerySourceProvider implements QuerySourceProvider {
  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  constructor(private readonly _params: IndexQueryProviderProps) {}

  // TODO(burdon): Rename createQuerySource
  create(): QuerySource {
    return new IndexQuerySource({
      service: this._params.service,
      objectLoader: this._params.objectLoader,
      graph: this._params.graph,
    });
  }
}

export type IndexQuerySourceProps = {
  service: Echo.QueryService;
  objectLoader: ObjectLoader;
  graph: Hypergraph.Hypergraph;
};

/**
 * Runs queries against an index.
 */
export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();

  private _query?: QueryAST.Query = undefined;
  private _results?: QueryResult.EntityEntry[] = [];
  private _stream?: Stream<QueryPb.QueryResponse>;
  private _open = false;

  constructor(private readonly _params: IndexQuerySourceProps) {}

  open(): void {
    this._open = true;
  }

  close(): void {
    this._open = false;
    this._results = undefined;
    this._closeStream();
  }

  getResults(): QueryResult.EntityEntry[] {
    return this._results ?? [];
  }

  async run(query: QueryAST.Query): Promise<QueryResult.EntityEntry[]> {
    this._query = query;
    return new Promise((resolve, reject) => {
      this._queryIndex(query, QueryReactivity.ONE_SHOT, resolve, reject);
    });
  }

  update(query: QueryAST.Query): void {
    this._query = query;

    this._closeStream();
    this._results = [];
    this.changed.emit();

    // Don't start a reactive remote query until the query context is started (calls `open()`).
    // This prevents `.query(...).run()` from accidentally triggering a REACTIVE query in addition to the ONE_SHOT query.
    if (!this._open) {
      return;
    }

    this._queryIndex(query, QueryReactivity.REACTIVE, (results) => {
      this._results = results;
      this.changed.emit();
    });
  }

  private _queryIndex(
    query: QueryAST.Query,
    queryType: QueryReactivity,
    onResult: (results: QueryResult.EntityEntry[]) => void,
    onError?: (error: Error) => void,
  ): void {
    const queryId = nextQueryId++;

    log('queryIndex', { queryId });
    const start = Date.now();
    let currentCtx: Context;

    const stream = this._params.service.execQuery(
      create(QueryPb.QueryRequestSchema, {
        query: JSON.stringify(query),
        queryId: String(queryId),
        reactivity: queryType,
      }),
      { timeout: QUERY_SERVICE_TIMEOUT },
    );

    if (queryType === QueryReactivity.REACTIVE) {
      if (this._stream) {
        log.warn('Query stream already open');
      }
      this._stream = stream;
    }

    stream.subscribe(
      async (response) => {
        try {
          const targetSpaces = getTargetSpacesForQuery(query);
          if (targetSpaces.length > 0) {
            invariant(
              response.results?.every((r) => r.spaceId && targetSpaces.includes(SpaceId.make(r.spaceId))),
              'Result spaceId mismatch',
            );
          }

          if (queryType === QueryReactivity.ONE_SHOT) {
            if (currentCtx) {
              return;
            }
            void stream.close().catch(() => {});
          }

          await currentCtx?.dispose();
          const ctx = new Context();
          currentCtx = ctx;

          log('queryIndex raw results', {
            queryId,
            length: response.results?.length ?? 0,
          });

          const processedResults = await Promise.all(
            (response.results ?? []).map((result) => this._filterMapResult(ctx, start, result)),
          );
          const results = processedResults.filter(isNonNullable);

          log('queryIndex processed results', {
            queryId,
            fetchedFromIndex: response.results?.length ?? 0,
            loaded: results.length,
          });

          if (currentCtx === ctx) {
            onResult(results);
          } else {
            log.warn('results from the previous update are ignored', {
              queryId,
            });
          }
        } catch (err: any) {
          if (onError) {
            onError(err);
          } else {
            log.catch(err);
          }
        }
      },
      (err) => {
        if (err != null) {
          if (onError) {
            onError(err);
          } else if (!(err instanceof RpcClosedError)) {
            log.catch(err);
          }
        }
      },
    );
  }

  private async _filterMapResult(
    ctx: Context,
    queryStartTimestamp: number,
    result: QueryPb.QueryResult,
  ): Promise<QueryResult.EntityEntry | null> {
    const { id, spaceId } = result;
    if (!id || !spaceId) {
      return null;
    }

    if (!OBJECT_DIAGNOSTICS.has(id)) {
      OBJECT_DIAGNOSTICS.set(id, {
        objectId: id,
        spaceId,
        loadReason: 'query',
        query: JSON.stringify(this._query ?? null),
      });
    }

    invariant(SpaceId.isValid(spaceId), 'Invalid spaceId');

    // For queue items, hydrate using Obj.fromJSON with ref resolver.
    if (result.queueId && result.documentJson) {
      const json = JSON.parse(result.documentJson);
      const queueDxn = DXN.fromQueue(
        (result.queueNamespace ?? 'data') as QueueSubspaceTag,
        spaceId as SpaceId,
        result.queueId as ObjectId,
      );
      const refResolver = this._params.graph.createRefResolver({
        context: { space: spaceId as SpaceId, queue: queueDxn },
      });
      const object = await Obj.fromJSON(json, {
        refResolver,
        dxn: queueDxn.extend([id as ObjectId]),
      });
      const queryResult: QueryResult.EntityEntry = {
        id,
        result: object,
        match: { rank: result.rank ?? 1 },
        resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
      };
      return queryResult;
    }

    const object = await this._params.objectLoader.loadObject({
      spaceId,
      objectId: id,
      documentId: result.documentId,
    });
    if (!object) {
      return null;
    }

    if (ctx.disposed) {
      return null;
    }

    const queryResult: QueryResult.EntityEntry = {
      id: object.id,
      result: object,
      match: { rank: result.rank ?? 1 },
      resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
    };
    return queryResult;
  }

  private _closeStream(): void {
    void this._stream?.close().catch(() => {});
    this._stream = undefined;
  }
}

/**
 * Used for logging.
 */
let nextQueryId = 1;
