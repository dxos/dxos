//
// Copyright 2022 DXOS.org
//

import fetch from 'cross-fetch';

import { ObservableProvider, type ObservableValue } from '@dxos/async';
import { type Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { ApiError } from '@dxos/protocols';
import { type Module } from '@dxos/protocols/proto/dxos/config';

export interface QueryEvents<T> {
  onUpdate(result: T[]): void;
}

// TODO(burdon): Observable pattern?
export interface QueryObservable<T> extends ObservableValue<QueryEvents<T>> {
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

  async fetch(): Promise<void> {
    await this._callback();
  }
}

export type Query = {
  type?: string;
  tags?: string[];
};

export interface ServiceApi<T> {
  query(query?: Query): Promise<QueryObservable<T>>;
}

export interface Metagraph {
  get modules(): ServiceApi<Module>;
}

const moduleFilter = (query?: Query) => (module: Module) => {
  if (query?.type !== undefined && query.type !== module.type) {
    return false;
  }

  return !query?.tags?.length || query?.tags?.filter((tag) => module.tags?.includes(tag)).length > 0;
};

/**
 * Metagraph client API.
 */
// TODO(burdon): Unit test.
export class MetagraphClient implements Metagraph {
  private readonly _serverUrl!: string;

  constructor(private readonly _config: Config) {
    // TODO(burdon): Add URL field.
    // TODO(burdon): Rename dxns config field.
    this._serverUrl =
      this._config.get('runtime.services.dxns.server') ?? raise(new ApiError({ message: 'Invalid DXNS server.' }));
  }

  get modules(): ServiceApi<Module> {
    return {
      query: async (query: Query = {}) => {
        const observable = new QueryObservableProvider<Module>(async () => {
          // TODO(burdon): Replace fetch with dxRPC?
          const response = await fetch(this._serverUrl);
          const { modules = [] } = ((await response.json()) as { modules: Module[] }) ?? {};
          observable.results = modules.filter(moduleFilter(query));
        });

        await observable.fetch();
        return observable;
      },
    };
  }
}

// TODO(burdon): Move to /testing.
export class MetagraphClientFake implements Metagraph {
  constructor(private readonly _modules: Module[] = []) {}

  get modules(): ServiceApi<Module> {
    return {
      query: async (query: Query) => {
        const observable = new QueryObservableProvider<Module>(async () => {
          observable.results = this._modules.filter(moduleFilter(query));
        });

        await observable.fetch();
        return observable;
      },
    };
  }
}
