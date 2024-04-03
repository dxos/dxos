//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
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
import { log } from '@dxos/log';
import { type IndexService } from '@dxos/protocols/proto/dxos/client/services';

import { type SpaceList } from './space-list';
import { type SpaceProxy } from './space-proxy';

export type IndexQueryProviderParams = {
  service: IndexService;
  spaceList: SpaceList;
};

// TODO(mykola): Separate by client-services barrier.
export class IndexQuerySourceProvider implements QuerySourceProvider {
  constructor(private readonly _params: IndexQueryProviderParams) {}

  private async find(filter: Filter): Promise<QueryResult<EchoObject>[]> {
    const start = Date.now();
    const response = await this._params.service.find({ filter: filter.toProto() });

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

    return results.filter(Boolean) as QueryResult<EchoObject>[];
  }

  create(): QuerySource {
    return new IndexQuerySource({ find: (params) => this.find(params) });
  }
}

export type IndexQuerySourceParams = {
  find: (filter: Filter) => Promise<QueryResult<EchoObject>[]>;
};

export class IndexQuerySource implements QuerySource {
  changed = new Event<void>();
  private _results?: QueryResult<EchoObject>[] = [];

  constructor(private readonly _params: IndexQuerySourceParams) {}

  getResults(): QueryResult<EchoObject>[] {
    return this._results ?? [];
  }

  update(filter: Filter<EchoObject>): void {
    this._results = [];
    this.changed.emit();

    this._params
      .find(filter)
      .then((results) => {
        if (results.length === 0) {
          return;
        }
        this._results = results;
        this.changed.emit();
      })
      .catch((error) => log.catch(error));
  }
}
