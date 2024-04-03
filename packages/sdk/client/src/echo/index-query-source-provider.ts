//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import {
  type QuerySourceProvider,
  type EchoObject,
  type Filter,
  type QueryResult,
  type QuerySource,
  filterMatch,
  getAutomergeObjectCore,
} from '@dxos/echo-schema';
import { type QueryResponse } from '@dxos/protocols/proto/dxos/agent/query';
import { type IndexService } from '@dxos/protocols/proto/dxos/client/services';

import { type SpaceList } from './space-list';
import { type SpaceProxy } from './space-proxy';

export type IndexQueryProviderParams = {
  service: IndexService;
  spaceList: SpaceList;
};

export class IndexQuerySourceProvider implements QuerySourceProvider {
  constructor(private readonly _params: IndexQueryProviderParams) {}

  create(): QuerySource {
    return new IndexQuerySource({ service: this._params.service, spaceList: this._params.spaceList });
  }
}

export type IndexQuerySourceParams = {
  service: IndexService;
  spaceList: SpaceList;
};

export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();
  private _results?: QueryResult<EchoObject>[] = [];
  private _stream?: Stream<QueryResponse>;

  constructor(private readonly _params: IndexQuerySourceParams) {}

  getResults(): QueryResult<EchoObject>[] {
    return this._results ?? [];
  }

  update(filter: Filter<EchoObject>): void {
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

      const results: (QueryResult<EchoObject> | undefined)[] = await Promise.all(
        response.results!.map(async (result) => {
          const space = this._params.spaceList.get(result.spaceKey);
          if (!space) {
            return;
          }

          const object = await warnAfterTimeout(2000, 'Loading object', async () => {
            await (space as SpaceProxy)._databaseInitialized.wait();
            return space.db.automerge.loadObjectById(result.id);
          });
          if (ctx.disposed) {
            return;
          }

          if (!object) {
            return;
          }

          const core = getAutomergeObjectCore(object);
          if (!filterMatch(filter, core)) {
            return;
          }

          return {
            id: object.id,
            spaceKey: core.database!.spaceKey,
            object,
            match: { rank: result.rank },
            resolution: { source: 'index', time: Date.now() - start },
          };
        }),
      );

      if (ctx.disposed) {
        return;
      }
      this._results = results.filter(Boolean) as QueryResult<EchoObject>[];
      this.changed.emit();
    });
  }
}
