//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { type Obj, type QueryResult } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import {
  QueryReactivity,
  type QueryResponse,
  type QueryService,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { isNonNullable } from '@dxos/util';

import { getObjectCore } from '../echo-handler';
import { OBJECT_DIAGNOSTICS, type QuerySourceProvider } from '../hypergraph';
import { type QuerySource, getTargetSpacesForQuery } from '../query';

export type LoadObjectParams = {
  spaceId: SpaceId;
  objectId: string;
  documentId: string;
};

export interface ObjectLoader {
  loadObject(params: LoadObjectParams): Promise<Obj.Obj<any> | undefined>;
}

export type IndexQueryProviderParams = {
  service: QueryService;
  objectLoader: ObjectLoader;
};

const QUERY_SERVICE_TIMEOUT = 20_000;

export class IndexQuerySourceProvider implements QuerySourceProvider {
  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  constructor(private readonly _params: IndexQueryProviderParams) {}

  // TODO(burdon): Rename createQuerySource
  create(): QuerySource {
    return new IndexQuerySource({ service: this._params.service, objectLoader: this._params.objectLoader });
  }
}

export type IndexQuerySourceParams = {
  service: QueryService;
  objectLoader: ObjectLoader;
};

/**
 * Runs queries against an index.
 */
export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();

  private _query?: QueryAST.Query = undefined;
  private _results?: QueryResult.Entry[] = [];
  private _stream?: Stream<QueryResponse>;

  constructor(private readonly _params: IndexQuerySourceParams) {}

  open(): void {}

  close(): void {
    this._results = undefined;
    this._closeStream();
  }

  getResults(): QueryResult.Entry[] {
    return this._results ?? [];
  }

  async run(query: QueryAST.Query): Promise<QueryResult.Entry[]> {
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
    this._queryIndex(query, QueryReactivity.REACTIVE, (results) => {
      this._results = results;
      this.changed.emit();
    });
  }

  private _queryIndex(
    query: QueryAST.Query,
    queryType: QueryReactivity,
    onResult: (results: QueryResult.Entry[]) => void,
    onError?: (error: Error) => void,
  ): void {
    const queryId = nextQueryId++;

    log('queryIndex', { queryId });
    const start = Date.now();
    let currentCtx: Context;

    const stream = this._params.service.execQuery(
      { query: JSON.stringify(query), queryId: String(queryId), reactivity: queryType },
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
              response.results?.every((r) => targetSpaces.includes(SpaceId.make(r.spaceId))),
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
            log.warn('results from the previous update are ignored', { queryId });
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
    result: RemoteQueryResult,
  ): Promise<QueryResult.Entry | null> {
    if (!OBJECT_DIAGNOSTICS.has(result.id)) {
      OBJECT_DIAGNOSTICS.set(result.id, {
        objectId: result.id,
        spaceId: result.spaceId,
        loadReason: 'query',
        query: JSON.stringify(this._query ?? null),
      });
    }

    invariant(SpaceId.isValid(result.spaceId), 'Invalid spaceId');
    const object = await this._params.objectLoader.loadObject({
      spaceId: result.spaceId,
      objectId: result.id,
      documentId: result.documentId,
    });
    if (!object) {
      return null;
    }

    if (ctx.disposed) {
      return null;
    }

    const core = getObjectCore(object);
    const queryResult: QueryResult.Entry = {
      id: object.id,
      spaceId: core.database!.spaceId,
      object,
      match: { rank: result.rank },
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
