//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { Event } from '@dxos/async';
import { CID, IRegistryClient, RegistryTypeRecord, Resource } from '@dxos/registry-client';
import { SearchAutocomplete, SearchModel, SearchResult } from '@dxos/react-components';

import { RegistryTypeFilter } from './RegistryTypeFilter';

/**
 * Filterable resource search model.
 */
export class RegistrySearchModel implements SearchModel<Resource> {
  _update = new Event<SearchResult<Resource>[]>();
  _results: SearchResult<Resource>[] = [];
  _text?: string = undefined;

  constructor (
    private readonly _registry: IRegistryClient,
    private _types: CID[] = []
  ) {}

  get results () {
    return [];
  }

  subscribe (callback: (results: SearchResult<Resource>[]) => void) {
    return this._update.on(callback);
  }

  setTypes (types: CID[] = []) {
    this._types = types;
    this.doUpdate();
  }

  setText (text?: string) {
    this._text = text;
    this.doUpdate();
  }

  doUpdate () {
    setImmediate(async () => {
      // TODO(burdon): Push type predicate.
      // TODO(burdon): Extend filter for Braneframe ActionDialog.
      let resources = await this._registry.queryResources({ text: this._text });
      if (this._types.length) {
        resources = resources.filter(resource => this._types.some(type => type.equals(resource.type!)));
      }

      this._results = resources.map(resource => ({
        text: resource.id.toString(),
        value: resource
      }));
    });
  }
}

export interface RegistrySearchPanelProps {
  model: RegistrySearchModel
  types?: RegistryTypeRecord[]
  onSelect: (resource: Resource) => void
}

/**
 * Registry search with optional filters.
 */
export const RegistrySearchPanel = ({
  model,
  types = [],
  onSelect
}: RegistrySearchPanelProps) => {
  const [selectedTypes, setSelectedTypes] = useState<CID[]>([]);

  // TODO(burdon): Factor out.
  // useEffect(() => {
  //   setImmediate(async () => {
  //     const types = await registry.getTypeRecords();
  //     setTypes(types);
  //   });
  // }, []);

  const handleTypeSelect = (selected: CID[]) => {
    setSelectedTypes(selected);
    model.setTypes(selected);
  }

  const handleSelect = (selected: SearchResult<Resource>) => {
    onSelect(selected.value);
  };

  return (
    <Box>
      {types.length !== 0 && (
        <RegistryTypeFilter
          types={types}
          selected={selectedTypes} // TODO(burdon): Controlled?
          onSelectedChange={handleTypeSelect}
        />
      )}

      <SearchAutocomplete
        model={model}
        onSelect={handleSelect}
      />
    </Box>
  );
};
