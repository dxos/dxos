//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import { type Indexer } from './indexer';
import { type QuerySourceProvider } from '../hypergraph';
import { db, type EchoObject } from '../object';
import { type Filter, type QueryResult, type QuerySource } from '../query';

export type IndexQueryProviderParams = {
  indexer: Indexer;
  loadObjects: (ids: string[]) => Promise<EchoObject[]>;
};

// TODO(mykola): Separate by client-services barrier.
export class IndexQueryProvider implements QuerySourceProvider {
  constructor(private readonly _params: IndexQueryProviderParams) {}

  private async find(filter: Filter): Promise<QueryResult<EchoObject>[]> {
    const start = Date.now();
    const idAndRanks = await this._params.indexer.find(filter);

    const objects = (await this._params.loadObjects(idAndRanks.map((idAndRank) => idAndRank.id))).filter(
      Boolean,
    ) as EchoObject[];

    const results: QueryResult<EchoObject>[] = objects.map((object, index) => ({
      id: object.id,
      spaceKey: object[db]!.spaceKey,
      object,
      match: { rank: idAndRanks[index].rank },
      resolution: { source: 'index', time: Date.now() - start },
    }));

    return results;
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
