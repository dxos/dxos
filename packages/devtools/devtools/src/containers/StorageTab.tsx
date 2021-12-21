//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, Button } from '@mui/material';

import { useClient } from '@dxos/react-client';

export const StorageTab = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;

  async function handleReset () {
    if (window.confirm('RESET ALL DATA (CANNOT BE UNDONE)?')) {
      await devtoolsHost.ResetStorage({});
    }
  }

  return (
    <Box padding={2}>
      <Button variant='outlined' size='small' onClick={handleReset}>Reset storage</Button>
    </Box>
  );
};
