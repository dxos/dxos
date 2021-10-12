//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
import React, { useEffect } from 'react';

import { ClientInitializer, useClient } from '../src';
import { JsonPanel } from './helpers';

export default {
  title: 'react-client/ClientInitializer'
};

const TestApp = () => {
  const client = useClient();

  useEffect(() => {
    setImmediate(async () => {
      await client.halo.createProfile({ username: 'Test' });
    });
  }, []);

  return (
    <Box>
      <Box style={{ padding: 8 }}>
        Config
        <JsonPanel value={client.config} />
      </Box>

      {/* TODO(burdon): Show client profile. */}
      <Box style={{ padding: 8 }}>
        Client
        <JsonPanel value={client.info()} />
      </Box>
    </Box>
  );
};

export const Primary = () => {
  return (
    <ClientInitializer config={{ swarm: { signal: undefined } }}>
      <TestApp />
    </ClientInitializer>
  );
};
