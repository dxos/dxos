//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { useClient } from '@dxos/react-client';

export const StoragePanel = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;

  async function handleReset () {
    if (window.confirm('RESET ALL DATA (CANNOT BE UNDONE)?')) {
      await devtoolsHost.ResetStorage({});
    }
  }

  return (
    <Box sx={{ padding: 1 }}>
      <Toolbar>
        <Button variant='outlined' onClick={handleReset}>Reset storage</Button>
      </Toolbar>
    </Box>
  );
};
