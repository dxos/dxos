//
// Copyright 2022 DXOS.org
//

import fetch from 'node-fetch';

import { Observable, ObservableProvider } from '@dxos/async';
import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { ApiError } from '@dxos/errors';
import { Module } from '@dxos/protocols/proto/dxos/config';

export interface QueryEvents<T> {
  onUpdate(result: T[]): void;
}

export interface QueryObservable<T> extends Observable<QueryEvents<T>> {
  get results(): T[];
  fetch(): void;
}

export class QueryObservableProvider<T> extends ObservableProvider<QueryEvents<T>> implements QueryObservable<T> {
  private _results: T[] = [];

  constructor(private readonly _callback: () => Promise<void>) {
    super();
  }

  get results(): T[] {
    return this._results;
  }

  set results(results: T[]) {
    this._results = results ?? [];
    this.callback.onUpdate(this._results);
  }

  async fetch() {
    await this._callback();
  }
}

export type Query = {
  tags?: string[];
};

export interface ServiceApi<T> {
  query(query?: Query): Promise<QueryObservable<T>>;
}

/**
 * Metagraph client API.
 */
export class Metagraph {
  private readonly _serverUrl!: string;

  constructor(private readonly _config: Config) {
    // TODO(burdon): Add URL field.
    // TODO(burdon): Rename dxns config field.
    this._serverUrl = this._config.get('runtime.services.dxns.server') ?? raise(new ApiError('Invalid DXNS server.'));
  }

  get modules(): ServiceApi<Module> {
    return {
      query: async (query?: Query) => {
        // TODO(burdon): Replace fetch with dxRPC?
        // TODO(burdon): Cache observables?
        const observable = new QueryObservableProvider<Module>(async () => {
          const response = await fetch(this._serverUrl);
          const { modules = [] } = ((await response.json()) as { modules: Module[] }) ?? {};
          observable.results = modules.filter(({ tags }) => {
            if (!query?.tags?.length) {
              return true;
            }

            return query?.tags?.filter((tag) => tags?.includes(tag)).length > 0;
          });
        });

        await observable.fetch();
        return observable;
      }
    };
  }
}
