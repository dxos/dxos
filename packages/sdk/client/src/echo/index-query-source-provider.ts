//
// Copyright 2024 DXOS.org
//

import { Event, asyncTimeout } from '@dxos/async';
import {
  type QuerySourceProvider,
  db,
  type EchoObject,
  type Filter,
  type QueryResult,
  type QuerySource,
} from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type IndexService } from '@dxos/protocols/proto/dxos/client/services';

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

    const results: (QueryResult<EchoObject> | undefined)[] = await Promise.all(
      response.results.map(async (result) => {
        const space = this._params.spaceList.get(result.spaceKey);
        if (!space) {
          return;
        }
        await asyncTimeout(space?.waitUntilReady(), 5000);
        const object = space?.db.getObjectById(result.id);
        if (!object) {
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
    this._results = undefined;
    this.changed.emit();

    this._params
      .find(filter)
      .then((results) => {
        this._results = results;
        this.changed.emit();
      })
      .catch((error) => log.catch(error));
  }
}
