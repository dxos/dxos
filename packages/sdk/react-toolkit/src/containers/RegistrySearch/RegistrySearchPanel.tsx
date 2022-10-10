//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Autocomplete, Box, TextField } from '@mui/material';

import { SearchAutocomplete, SearchResult } from '@dxos/react-components';
import { RegistryType, ResourceSet } from '@dxos/registry-client';

import { RegistrySearchModel } from './RegistrySearchModel.js';

export interface RegistrySearchPanelProps {
  model: RegistrySearchModel
  types?: RegistryType[]
  versions?: boolean
  clearOnSelect?: boolean
  onSelect: (resource: ResourceSet, version?: string) => void
}

/**
 * Registry search with optional filters.
 */
// TODO(wittjosiah): Integrate second step (versions => rename tags) into SearchModel.
export const RegistrySearchPanel = ({
  model,
  types = [],
  versions,
  clearOnSelect,
  onSelect
}: RegistrySearchPanelProps) => {
  // const [selectedTypes, setSelectedTypes] = useState<CID[]>([]);
  const [resource, setResource] = useState<ResourceSet>();

  const resourceTags = Object.keys(resource?.tags ?? {});

  // TODO(wittjosiah): Maybe re-add once integrating with DXQS?
  //   Resources aren't typed directly and types are only enforced at the record level.
  // const handleTypeSelect = (types: CID[]) => {
  //   setSelectedTypes(types);
  //   model.setFilters([
  //     createTypeFilter(types)
  //   ]);
  // };

  const handleResourceSelect = (selected: SearchResult<ResourceSet>) => {
    if (!versions) {
      onSelect(selected?.value);
      return;
    }

    setResource(selected?.value);
  };

  const handleVersionSelect = (selected: string) => {
    if (resource) {
      onSelect(resource, selected);
      setResource(undefined);
    }
  };

  return (
    <Box>
      {/* {types.length !== 0 && (
        <RegistryTypeFilter
          types={types}
          selected={selectedTypes}
          onSelectedChange={handleTypeSelect}
        />
      )} */}

      {(!versions || !resource) && (
        <SearchAutocomplete
          model={model}
          groupBy={types?.length ? 'type' : undefined}
          clearOnSelect={versions ?? clearOnSelect}
          onSelect={handleResourceSelect}
        />
      )}

      {(versions && resource) && (
        <Autocomplete
          fullWidth
          autoHighlight
          clearOnEscape
          openOnFocus
          options={resourceTags}
          noOptionsText='No matches'
          onChange={(event, value) => value && handleVersionSelect(value)}
          renderInput={params => (
            <TextField
              {...params}
              autoFocus
              autoComplete='off'
              spellCheck={false}
              variant='standard'
              placeholder='Select version'
            />
          )}
        />
      )}
    </Box>
  );
};
