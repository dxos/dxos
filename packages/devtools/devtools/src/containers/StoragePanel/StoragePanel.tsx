//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { useDevtools } from '@dxos/react-client';

export const StoragePanel = () => {
  const devtoolsHost = useDevtools();

  const handleReset = async () => {
    if (window.confirm('RESET ALL DATA (CANNOT BE UNDONE)?')) {
      await devtoolsHost.resetStorage({});
    }
  };

  return (
    <Box sx={{ padding: 1 }}>
      <Toolbar>
        <Button variant='outlined' onClick={handleReset}>Reset storage</Button>
      </Toolbar>
    </Box>
  );
};
