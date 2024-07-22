//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import {
  type QueryResponse,
  type QueryService,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { nonNullable } from '@dxos/util';

import { getObjectCore } from '../core-db';
import { OBJECT_DIAGNOSTICS, type QuerySourceProvider } from '../hypergraph';
import { type Filter, type QueryResult, type QuerySource } from '../query';

export type LoadObjectParams = {
  spaceKey: PublicKey;
  objectId: string;
  documentId: string;
};

export interface ObjectLoader {
  loadObject(params: LoadObjectParams): Promise<EchoReactiveObject<any> | undefined>;
}

export type IndexQueryProviderParams = {
  service: QueryService;
  objectLoader: ObjectLoader;
};

/**
 * Used for logging.
 */
let INDEX_QUERY_ID = 1;

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

export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();

  private _filter?: Filter = undefined;
  private _results?: QueryResult[] = [];
  private _stream?: Stream<QueryResponse>;

  constructor(private readonly _params: IndexQuerySourceParams) {}

  getResults(): QueryResult[] {
    return this._results ?? [];
  }

  async run(filter: Filter): Promise<QueryResult[]> {
    this._filter = filter;
    return new Promise((resolve, reject) => {
      this._queryIndex(filter, QueryType.ONE_SHOT, resolve, reject);
    });
  }

  update(filter: Filter): void {
    if (filter.options?.dataLocation === QueryOptions.DataLocation.LOCAL) {
      return;
    }

    this._filter = filter;

    this._closeStream();
    this._results = [];
    this.changed.emit();
    this._queryIndex(filter, QueryType.UPDATES, (results) => {
      this._results = results;
      this.changed.emit();
    });
  }

  close(): void {
    this._results = undefined;
    this._closeStream();
  }

  private _queryIndex(
    filter: Filter,
    queryType: QueryType,
    onResult: (results: QueryResult[]) => void,
    onError: (error: Error) => void = (error: any) => log.catch(error),
  ) {
    const queryId = INDEX_QUERY_ID++;

    log('queryIndex', { queryId });
    const start = Date.now();
    let currentCtx: Context;
    const stream = this._params.service.execQuery({ filter: filter.toProto() }, { timeout: QUERY_SERVICE_TIMEOUT });

    if (queryType === QueryType.UPDATES) {
      if (this._stream) {
        log.warn('Query stream already open');
      }
      this._stream = stream;
    }

    stream.subscribe(
      async (response) => {
        if (queryType === QueryType.ONE_SHOT) {
          if (currentCtx) {
            return;
          }
          void stream.close().catch();
        }

        await currentCtx?.dispose();
        const ctx = new Context();
        currentCtx = ctx;

        log('queryIndex raw results', {
          queryId,
          length: response.results?.length ?? 0,
        });

        try {
          const processedResults = await Promise.all(
            (response.results ?? []).map((result) => this._filterMapResult(ctx, start, result)),
          );
          const results = processedResults.filter(nonNullable);

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
          onError(err);
        }
      },
      (err) => {
        if (err != null) {
          onError(err);
        }
      },
    );
  }

  private async _filterMapResult(
    ctx: Context,
    queryStartTimestamp: number,
    result: RemoteQueryResult,
  ): Promise<QueryResult | null> {
    if (!OBJECT_DIAGNOSTICS.has(result.id)) {
      OBJECT_DIAGNOSTICS.set(result.id, {
        objectId: result.id,
        spaceKey: result.spaceKey.toHex(),
        loadReason: 'query',
        query: JSON.stringify(this._filter?.toProto() ?? null),
      });
    }

    const object = await this._params.objectLoader.loadObject({
      spaceKey: result.spaceKey,
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
    const queryResult: QueryResult = {
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
    void this._stream?.close().catch();
    this._stream = undefined;
  }
}

enum QueryType {
  UPDATES,
  ONE_SHOT,
}
