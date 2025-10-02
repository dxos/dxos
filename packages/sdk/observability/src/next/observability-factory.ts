//
// Copyright 2025 DXOS.org
//

import { type MaybePromise, type MaybeProvider, getAsyncProviderValue } from '@dxos/util';

import * as Observability from './observability';
import type * as ObservabilityExtension from './observability-extension';

/**
 * Factory for creating an observability provider.
 */
export class ObservabilityFactory {
  static make(): ObservabilityFactory {
    return new ObservabilityFactory();
  }

  private _extensions: MaybePromise<ObservabilityExtension.Extension>[] = [];
  private _dataProviders: MaybePromise<Observability.DataProvider>[] = [];

  addExtension(extension: MaybeProvider<MaybePromise<ObservabilityExtension.Extension>>): ObservabilityFactory {
    const resolvedExtension = getAsyncProviderValue(extension);
    this._extensions.push(resolvedExtension);
    return this;
  }

  addDataProvider(dataProvider: MaybeProvider<MaybePromise<Observability.DataProvider>>): ObservabilityFactory {
    const resolvedDataProvider = getAsyncProviderValue(dataProvider);
    this._dataProviders.push(resolvedDataProvider);
    return this;
  }

  async create(): Promise<Observability.Observability> {
    const resolvedExtensions = await Promise.all(this._extensions);
    const resolvedDataProviders = await Promise.all(this._dataProviders);
    return Observability.make(resolvedExtensions, resolvedDataProviders);
  }
}
