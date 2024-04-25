//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Echo } from '@dxos/client-protocol';
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import {
  type QuerySourceProvider,
  type Filter,
  type QueryResult,
  type QuerySource,
  getAutomergeObjectCore,
} from '@dxos/echo-schema';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import {
  type QueryService,
  type QueryResponse,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { nonNullable } from '@dxos/util';

import { type SpaceProxy } from './space-proxy';

export type IndexQueryProviderParams = {
  service: QueryService;
  echo: Echo;
};

export class IndexQuerySourceProvider implements QuerySourceProvider {
  constructor(private readonly _params: IndexQueryProviderParams) {}

  create(): QuerySource {
    return new IndexQuerySource({ service: this._params.service, echo: this._params.echo });
  }
}

export type IndexQuerySourceParams = {
  service: QueryService;
  echo: Echo;
};

export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();
  private _results?: QueryResult[] = [];
  private _stream?: Stream<QueryResponse>;

  constructor(private readonly _params: IndexQuerySourceParams) {}

  getResults(): QueryResult[] {
    return this._results ?? [];
  }

  async run(filter: Filter): Promise<QueryResult[]> {
    return new Promise((resolve, reject) => {
      this._queryIndex(
        filter,
        (results) => {
          resolve(results);
          return OnResult.CLOSE_STREAM;
        },
        reject,
      );
    });
  }

  update(filter: Filter): void {
    if (filter.options?.dataLocation === QueryOptions.DataLocation.LOCAL) {
      return;
    }

    this._closeStream();
    this._results = [];
    this.changed.emit();
    this._queryIndex(filter, (results) => {
      this._results = results;
      this.changed.emit();
      return OnResult.CONTINUE;
    });
  }

  close(): void {
    this._results = undefined;
    this._closeStream();
  }

  private _queryIndex(
    filter: Filter,
    onResult: (results: QueryResult[]) => OnResult,
    onError?: (error: Error) => void,
  ) {
    const start = Date.now();
    const stream = this._params.service.find({ filter: filter.toProto() }, { timeout: 20_000 });
    let currentCtx: Context;
    stream.subscribe(
      async (response) => {
        await currentCtx?.dispose();
        const ctx = new Context();
        currentCtx = ctx;

        const results: QueryResult[] =
          (response.results?.length ?? 0) > 0
            ? (
                await Promise.all(
                  response.results!.map(async (result) => {
                    return this._filterMapResult(ctx, start, result);
                  }),
                )
              ).filter(nonNullable)
            : [];

        const next = onResult(results);
        if (next === OnResult.CLOSE_STREAM) {
          void stream.close().catch();
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
  ): Promise<QueryResult | null> {
    const space = this._params.echo.get(result.spaceKey);
    if (!space) {
      return null;
    }

    await (space as SpaceProxy)._databaseInitialized.wait();
    const object = await space.db.automerge.loadObjectById(result.id);
    if (ctx.disposed) {
      return null;
    }

    if (!object) {
      return null;
    }

    const core = getAutomergeObjectCore(object);

    const queryResult: QueryResult = {
      id: object.id,
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

enum OnResult {
  CONTINUE,
  CLOSE_STREAM,
}
