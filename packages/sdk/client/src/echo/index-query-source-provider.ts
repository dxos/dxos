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
import { type QueryService, type QueryResponse } from '@dxos/protocols/proto/dxos/echo/query';
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

  update(filter: Filter): void {
    if (filter.options?.dataLocation === QueryOptions.DataLocation.LOCAL) {
      return;
    }

    if (this._stream) {
      void this._stream.close();
      this._stream = undefined;
    }
    this._results = [];
    this.changed.emit();

    const start = Date.now();
    this._stream = this._params.service.find({ filter: filter.toProto() }, { timeout: 20_000 });
    let currentCtx: Context;
    this._stream.subscribe(async (response) => {
      await currentCtx?.dispose();
      const ctx = new Context();
      currentCtx = ctx;
      if (!response.results || response.results.length === 0) {
        return [];
      }

      const results: QueryResult[] = (
        await Promise.all(
          response.results!.map(async (result) => {
            const space = this._params.echo.get(result.spaceKey);
            if (!space) {
              return;
            }

            await (space as SpaceProxy)._databaseInitialized.wait();
            const object = await space.db.automerge.loadObjectById(result.id);
            if (ctx.disposed) {
              return;
            }

            if (!object) {
              return;
            }

            const core = getAutomergeObjectCore(object);

            const queryResult: QueryResult = {
              id: object.id,
              spaceKey: core.database!.spaceKey,
              object,
              match: { rank: result.rank },
              resolution: { source: 'index', time: Date.now() - start },
            };
            return queryResult;
          }),
        )
      ).filter(nonNullable);

      if (ctx.disposed) {
        return;
      }

      this._results = results;

      this.changed.emit();
    });
  }
}
