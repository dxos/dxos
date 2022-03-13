//
// Copyright 2021 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Box } from '@mui/material';

import { Resource } from '@dxos/registry-client';
import { RegistryProvider } from '@dxos/react-registry-client';

import { RegistrySearchPanel } from '../src';
import { createMockRegistry } from './helpers';

export default {
  title: 'react-framework/RegistrySearchPanel'
};

export const Primary = () => {
  const mockRegistry = useMemo(() => createMockRegistry(), []);
  const [selected, setSelected] = useState<Resource>();

  // TODO(burdon): Why externalize this?
  const handleSearch = useCallback((searchInput: string) => mockRegistry.queryResources({ text: searchInput }), []);

  return (
    <RegistryProvider registry={mockRegistry}>
      <Box sx={{ margin: 2 }}>
        <RegistrySearchPanel
          registry={mockRegistry} // TODO(burdon): Same for dialog (write up rules for components).
          onSearch={handleSearch}
          onSelect={async resource => setSelected(resource)}
        />

        <Box sx={{ marginTop: 2 }}>
          {String(selected?.id)}
        </Box>
      </Box>
    </RegistryProvider>
  );
};
