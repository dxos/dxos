//
// Copyright 2021 DXOS.org
//

import { useMemo } from 'react';

import { Event } from '@dxos/async';
import { CID, IRegistryClient, RegistryTypeRecord, Resource } from '@dxos/registry-client';
import { SearchModel, SearchResult } from '@dxos/react-components';

export type SearchFilter = (resource: Resource) => boolean

export const useRegistrySearchModel = (registry: IRegistryClient) => {
  return useMemo(() => new RegistrySearchModel(registry), []);
}

export const getTypeName = (type: RegistryTypeRecord) => {
  const parts = type.messageName.split('.');
  return parts[parts.length - 1];
}

export const createTypeFilter = (types: CID[]) => (resource: Resource) => {
  return types.some(type => type.equals(resource.type!));
};

export const createResourceFilter = (domainExp: RegExp, resourceExp: RegExp) => (resource: Resource) => {
  return domainExp.exec(resource.id.domain!) && resourceExp.exec(resource.id.resource);
};

/**
 * Filterable resource search model.
 */
// TODO(burdon): Create tests.
// TODO(burdon): Move to registry-client?
export class RegistrySearchModel implements SearchModel<Resource> {
  _update = new Event<SearchResult<Resource>[]>();
  _results: SearchResult<Resource>[] = [];
  _text?: string = undefined;
  _types: RegistryTypeRecord[] = [];

  constructor (
    private readonly _registry: IRegistryClient,
    private _filters: SearchFilter[] = []
  ) {}

  get types () {
    return this._types;
  }

  get results () {
    return [];
  }

  subscribe (callback: (results: SearchResult<Resource>[]) => void) {
    return this._update.on(callback);
  }

  async initialize () {
    this._types = await this._registry.getTypeRecords();
    this.doUpdate();
  }

  setText (text?: string) {
    this._text = text;
    this.doUpdate();
  }

  setFilters (filters: SearchFilter[]) {
    this._filters = filters;
    this.doUpdate();
  }

  doUpdate () {
    setImmediate(async () => {
      // TODO(burdon): Push predicates (e.g., type).
      let resources = await this._registry.queryResources({ text: this._text });
      if (this._filters.length) {
        resources = resources.filter(resource => {
          // Exclude if any filter fails.
          return !this._filters.some(filter => !filter(resource));
        });
      }

      this._results = resources.map(resource => {
        const type = this._types.find(type => resource.type && type.cid.equals(resource.type));
        return ({
          id: resource.id.toString(),
          type: type ? getTypeName(type) : undefined,
          text: resource.id.toString(),
          value: resource
        })
      });

      this._results = this._results.sort((a, b) => {
        let sort = 0;
        if (a.type && b.type) {
          sort = a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
        }
        if (sort === 0) {
          sort = a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
        }
        return sort;
      });

      this._update.emit(this._results);
    });
  }
}
