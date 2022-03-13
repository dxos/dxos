//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Autocomplete, Box, TextField } from '@mui/material';

import { CID, IRegistryClient, RegistryTypeRecord, Resource } from '@dxos/registry-client';

import { RegistryTypeFilter } from './RegistryTypeFilter';

export interface RegistrySearchPanelProps {
  registry: IRegistryClient
  typeFilter?: CID[]
  onSearch?: (searchInput: string) => Promise<Resource[]>
  onSelect: (resource: Resource) => Promise<void> // TODO(burdon): Why async?
}

/**
 *
 */
export const RegistrySearchPanel = ({
  registry,
  typeFilter = [],
  onSearch, // TODO(burdon): Why?
  onSelect
}: RegistrySearchPanelProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchOptions, setSearchOptions] = useState<Resource[]>([]);
  const [types, setTypes] = useState<RegistryTypeRecord[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<CID[]>(typeFilter);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [processing, setProcessing] = useState(false); // TODO(burdon): Why?

  const doSearch = async (searchInput: string) => {
    // TODO(burdon): Either fully externalize query or handle everything here.
    if (onSearch) {
      return onSearch(searchInput);
    }

    return registry.queryResources({ text: searchInput });
  };

  useEffect(() => {
    setImmediate(async () => {
      const types = await registry.getTypeRecords();
      setTypes(types);
    });
  }, []);

  useEffect(() => {
    setImmediate(async () => {
      const resources = await doSearch(searchInput);
      setSearchOptions(selectedTypes.length === 0 ? resources : resources.filter(resource =>
        selectedTypes.some(selectedType => resource.type && selectedType.equals(resource.type))
      ));
    });
  }, [searchInput, selectedTypes]);

  const handleReset = () => {
    setSearchInput('');
    setSearchOptions([]);
    setSelected(null);
    setSelectedTypes(typeFilter);
    setProcessing(false);
  };

  const handleSelect = async () => {
    setProcessing(true);
    selected && await onSelect?.(selected);
    handleReset(); // TODO(burdon): Why reset?
  };

  return (
    <Box>
      {typeFilter.length === 0 && (
        <RegistryTypeFilter
          types={types}
          selected={selectedTypes}
          onSelectedChange={selected => setSelectedTypes(selected)}
        />
      )}

      <Autocomplete
        fullWidth
        autoHighlight
        clearOnEscape
        options={searchOptions}
        getOptionLabel={option => option.id.toString()}
        inputValue={searchInput}
        onInputChange={(event, newValue) => setSearchInput(newValue)}
        value={selected}
        onChange={(event, newValue) => setSelected(newValue)}
        renderInput={params => (
          <TextField
            {...params}
            placeholder='Search'
            variant='standard'
            autoFocus
            autoComplete='off'
            spellCheck={false}
            onKeyPress={async (event) => {
              if (event.key === 'Enter' && (!processing || selected)) {
                await handleSelect();
              }
            }}
          />
        )}
      />
    </Box>
  );
};
