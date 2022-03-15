//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box } from '@mui/material';

import { CID, RegistryTypeRecord, Resource } from '@dxos/registry-client';
import { SearchAutocomplete, SearchResult } from '@dxos/react-components';

import { createTypeFilter, RegistrySearchModel } from './RegistrySearchModel';
import { RegistryTypeFilter } from './RegistryTypeFilter';

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

  // TODO(burdon): Factor out (pass in).
  // useEffect(() => {
  //   setImmediate(async () => {
  //     const types = await registry.getTypeRecords();
  //     setTypes(types);
  //   });
  // }, []);

  const handleTypeSelect = (types: CID[]) => {
    setSelectedTypes(types);
    model.setFilters([
      createTypeFilter(types)
    ]);
  }

  const handleSelect = (selected: SearchResult<Resource>) => {
    onSelect(selected?.value);
  };

  return (
    <Box>
      {types.length !== 0 && (
        <RegistryTypeFilter
          types={types}
          selected={selectedTypes}
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
