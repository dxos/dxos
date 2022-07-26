//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Box } from '@mui/material';

import { useProfile } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

export const ProfilePage = () => {
  const profile = useProfile();

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Box
        sx={{
          maxWidth: '25rem',
          margin: '0 auto'
        }}
      >
        <JsonTreeView data={{ profile }} />
      </Box>
    </Box>
  );
};
