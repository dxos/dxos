//
// Copyright 2021 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Box, Button } from '@mui/material';

import { sleep } from '@dxos/async';
import { RegistryProvider, useRegistry } from '@dxos/react-registry-client';

import { RegistrySearchDialog } from '../src';
import { createMockRegistry } from './helpers';

const DXNS_SERVER = 'wss://dxns1.kube.dxos.network/dxns/ws';

export default {
  title: 'react-framework/RegistrySearchDialog'
};

export const Primary = () => {
  const mockRegistry = useMemo(() => createMockRegistry(), []);
  const handleSearch = useCallback((searchInput: string) => mockRegistry.queryResources({ text: searchInput }), []);
  const [open, setOpen] = useState(true);

  return (
    <RegistryProvider registry={mockRegistry}>
      <Box margin={2}>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <RegistrySearchDialog
          open={open}
          onSearch={handleSearch}
          onSelect={() => sleep(1000).then(() => setOpen(false))}
          onClose={() => setOpen(false)}
        />
      </Box>
    </RegistryProvider>
  );
};

const WithRegistry = () => {
  const registry = useRegistry();
  const [open, setOpen] = useState(true);

  return (
    <Box margin={2}>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <RegistrySearchDialog
        open={open}
        onSelect={() => sleep(1000).then(() => setOpen(false))}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
};

export const WithTestnet = () => {
  return (
    <RegistryProvider config={{ services: { dxns: { server: DXNS_SERVER } } }}>
      <WithRegistry />
    </RegistryProvider>
  );
};
