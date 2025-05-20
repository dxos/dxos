//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import {
  QueryReactivity,
  type QueryResponse,
  type QueryService,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { isNonNullable } from '@dxos/util';

import { type AnyLiveObject } from '../echo-handler';
import { getObjectCore } from '../echo-handler';
import { OBJECT_DIAGNOSTICS, type QuerySource, type QuerySourceProvider } from '../hypergraph';
import { type DeprecatedFilter, type QueryResultEntry } from '../query';

export type LoadObjectParams = {
  spaceId: SpaceId;
  objectId: string;
  documentId: string;
};

export interface ObjectLoader {
  loadObject(params: LoadObjectParams): Promise<AnyLiveObject<any> | undefined>;
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

  private _filter?: DeprecatedFilter = undefined;
  private _results?: QueryResultEntry[] = [];
  private _stream?: Stream<QueryResponse>;

  constructor(private readonly _params: IndexQuerySourceParams) {}

  open(): void {}

  close(): void {
    this._results = undefined;
    this._closeStream();
  }

  getResults(): QueryResultEntry[] {
    return this._results ?? [];
  }

  async run(filter: DeprecatedFilter): Promise<QueryResultEntry[]> {
    this._filter = filter;
    return new Promise((resolve, reject) => {
      this._queryIndex(filter, QueryReactivity.ONE_SHOT, resolve, reject);
    });
  }

  update(filter: DeprecatedFilter): void {
    if (filter.options?.dataLocation === QueryOptions.DataLocation.LOCAL) {
      return;
    }

    this._filter = filter;

    this._closeStream();
    this._results = [];
    this.changed.emit();
    this._queryIndex(filter, QueryReactivity.REACTIVE, (results) => {
      this._results = results;
      this.changed.emit();
    });
  }

  private _queryIndex(
    filter: DeprecatedFilter,
    queryType: QueryReactivity,
    onResult: (results: QueryResultEntry[]) => void,
    onError?: (error: Error) => void,
  ) {
    const queryId = nextQueryId++;

    log('queryIndex', { queryId });
    const start = Date.now();
    let currentCtx: Context;

    const stream = this._params.service.execQuery(
      { filter: filter.toProto(), reactivity: queryType },
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
          if (filter.options?.spaceIds && filter.options?.spaceIds.length > 0) {
            invariant(
              response.results?.every((r) => filter.options.spaceIds?.includes(r.spaceId)),
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
  ): Promise<QueryResultEntry | null> {
    if (!OBJECT_DIAGNOSTICS.has(result.id)) {
      OBJECT_DIAGNOSTICS.set(result.id, {
        objectId: result.id,
        spaceKey: result.spaceKey.toHex(),
        loadReason: 'query',
        query: JSON.stringify(this._filter?.toProto() ?? null),
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
    const queryResult: QueryResultEntry = {
      id: object.id,
      spaceId: core.database!.spaceId,
      spaceKey: core.database!.spaceKey,
      object,
      match: { rank: result.rank },
      resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
    };
    return queryResult;
  }

  private _closeStream() {
    void this._stream?.close().catch(() => {});
    this._stream = undefined;
  }
}

/**
 * Used for logging.
 */
let nextQueryId = 1;
