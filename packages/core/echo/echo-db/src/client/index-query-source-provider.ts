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

export interface ObjectLoader {
  loadObject(
    spaceKey: PublicKey,
    objectId: string,
    options?: { timeout?: number },
  ): Promise<EchoReactiveObject<any> | undefined>;
}

export type IndexQueryProviderParams = {
  service: QueryService;
  objectLoader: ObjectLoader;
};

/**
 * Used for logging.
 */
let INDEX_QUERY_ID = 1;

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

  async run(filter: Filter, options?: { timeout: number }): Promise<QueryResult[]> {
    this._filter = filter;
    return new Promise((resolve, reject) => {
      this._queryIndex(filter, QueryType.ONE_SHOT, resolve, reject, options);
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
    onError?: (error: Error) => void,
    options?: { timeout: number },
  ) {
    const queryId = INDEX_QUERY_ID++;

    log('queryIndex', { queryId });
    const start = Date.now();
    let currentCtx: Context;
    const queryTimeout = options?.timeout ? options : { timeout: 20_000 };
    const stream = this._params.service.execQuery({ filter: filter.toProto() }, queryTimeout);

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

        const singleResultProcessingTimeout = options?.timeout
          ? { timeout: (options.timeout - (Date.now() - start)) * 0.9 }
          : undefined;

        log('queryIndex raw results', {
          queryId,
          rowLoadTimeTimeout: singleResultProcessingTimeout,
          length: response.results?.length ?? 0,
        });

        let failures = 0;
        const fetchedFromIndexCount = response.results?.length ?? 0;
        const processedResults: Array<QueryResult | null> =
          fetchedFromIndexCount > 0
            ? await Promise.all(
                response.results!.map((result) =>
                  this._filterMapResult(ctx, start, result, singleResultProcessingTimeout).catch((err) => {
                    failures++;
                    return null;
                  }),
                ),
              )
            : [];
        const results = processedResults.filter(nonNullable);

        log('queryIndex processed results', {
          queryId,
          fetchedFromIndex: fetchedFromIndexCount,
          failed: failures,
          loaded: results.length,
        });

        if (currentCtx === ctx) {
          onResult(results);
        } else {
          log.warn('results from the previous update are ignored', { queryId });
        }
      },
      (err) => {
        if (err != null && onError != null) {
          onError(err);
        }
      },
    );
  }

  private async _filterMapResult(
    ctx: Context,
    queryStartTimestamp: number,
    result: RemoteQueryResult,
    options?: { timeout?: number },
  ): Promise<QueryResult | null> {
    if (!OBJECT_DIAGNOSTICS.has(result.id)) {
      OBJECT_DIAGNOSTICS.set(result.id, {
        objectId: result.id,
        spaceKey: result.spaceKey.toHex(),
        loadReason: 'query',
        query: JSON.stringify(this._filter?.toProto() ?? null),
      });
    }

    const object = await this._params.objectLoader.loadObject(result.spaceKey, result.id, options);
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
