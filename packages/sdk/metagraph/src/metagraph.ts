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
}

export class QueryObservableProvider<T> extends ObservableProvider<QueryEvents<T>> implements QueryObservable<T> {
  private _results: T[] = [];

  get results(): T[] {
    return this._results;
  }

  set results(results: T[]) {
    this._results = results ?? [];
    this.callback.onUpdate(this._results);
  }
}

export interface ServiceApi<T> {
  query(): Promise<QueryObservable<T>>;
}

/**
 * Metagraph client API.
 */
export class Metagraph {
  private readonly _serverUrl!: string;

  constructor(private readonly _config: Config) {
    // TODO(burdon): Rename dxns config field.
    this._serverUrl = this._config.get('runtime.services.dxns.server') ?? raise(new ApiError('Invalid DXNS server.'));
  }

  get modules(): ServiceApi<Module> {
    return {
      query: async () => {
        const response = await fetch(this._serverUrl);
        const { modules } = await response.json();

        const observable = new QueryObservableProvider<Module>();
        observable.results = modules;
        return observable;
      }
    };
  }
}
