//
// Copyright 2020 DXOS.org
//

import { Box } from '@mui/material';
import React from 'react';

import { FullScreen } from '@dxos/react-components';

export const Container = ({ children }: { children: React.ReactNode }) => (
  <FullScreen style={{ backgroundColor: '#EEE' }}>
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        justifyContent: 'center'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: 600,
          backgroundColor: 'white'
        }}
      >
        {children}
      </Box>
    </Box>
  </FullScreen>
);
