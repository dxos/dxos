//
// Copyright 2021 DXOS.org
//

import { useMemo } from 'react';

import { Event } from '@dxos/async';
import { SearchModel, SearchResult } from '@dxos/react-components';
import { CID, IRegistryClient, RegistryTypeRecord, Resource } from '@dxos/registry-client';

export type SearchFilter = (resource: Resource) => boolean

export const useRegistrySearchModel = (registry: IRegistryClient, filters: SearchFilter[] = []) => {
  return useMemo(() => new RegistrySearchModel(registry, filters), []);
};

export const getTypeName = (type: RegistryTypeRecord) => {
  const parts = type.messageName.split('.');
  return parts[parts.length - 1];
};

export const createTypeFilter = (types: CID[]) => (resource: Resource) => {
  return types.some(type => resource.type && type.equals(resource.type));
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
  private readonly _update = new Event<SearchResult<Resource>[]>();
  private _results: SearchResult<Resource>[] = [];
  private _text?: string = undefined;
  private _types: RegistryTypeRecord[] = [];

  constructor (
    private readonly _registry: IRegistryClient,
    private _filters: SearchFilter[] = []
  ) {}

  get types () {
    return this._types;
  }

  get results () {
    return this._results;
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
        const type = this._types.find(type => resource.type && resource.type.equals(type.cid));
        return ({
          id: resource.id.toString(),
          type: type ? getTypeName(type) : undefined,
          text: resource.id.toString(),
          value: resource
        });
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
