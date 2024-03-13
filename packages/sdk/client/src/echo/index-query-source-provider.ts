//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { warnAfterTimeout } from '@dxos/debug';
import {
  type QuerySourceProvider,
  db,
  type EchoObject,
  type Filter,
  type QueryResult,
  type QuerySource,
  filterMatch,
  base,
  getAutomergeObjectCore,
} from '@dxos/echo-schema';
import { prohibitSignalActions } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type IndexService } from '@dxos/protocols/proto/dxos/client/services';
import { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import { type SpaceList } from './space-list';

export type IndexQueryProviderParams = {
  service: IndexService;
  spaceList: SpaceList;
};

// TODO(mykola): Separate by client-services barrier.
export class IndexQuerySourceProvider implements QuerySourceProvider {
  constructor(private readonly _params: IndexQueryProviderParams) {}

  private async find(filter: Filter): Promise<QueryResult<EchoObject>[]> {
    const start = Date.now();
    const response = await this._params.service.find({ queryId: PublicKey.random().toHex(), filter: filter.toProto() });
    if (!response.results) {
      return [];
    }

    const results: (QueryResult<EchoObject> | undefined)[] = await prohibitSignalActions(() =>
      Promise.all(
        response.results!.map(async (result) => {
          const space = this._params.spaceList.get(result.spaceKey);
          if (!space) {
            return;
          }

          const object = await warnAfterTimeout(2000, 'takes to long to load object', async () => {
            await space.waitUntilReady();
            return space.db.automerge.loadObjectById(result.id);
          });

          if (!object) {
            return;
          }

          if (!filterMatch(filter, getAutomergeObjectCore(object[base]))) {
            return;
          }

          return {
            id: object.id,
            spaceKey: object[db]!.spaceKey,
            object,
            match: { rank: result.rank },
            resolution: { source: 'index', time: Date.now() - start },
          };
        }),
      ),
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
    if (filter.options.dataLocation === undefined || filter.options.dataLocation === QueryOptions.DataLocation.LOCAL) {
      // Disabled by dataLocation filter.
      return;
    }
    this._results = undefined;
    this.changed.emit();

    this._params
      .find(filter)
      .then((results) => {
        prohibitSignalActions(() => {
          this._results = results;
          this.changed.emit();
        });
      })
      .catch((error) => log.catch(error));
  }
}
