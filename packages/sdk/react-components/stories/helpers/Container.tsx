//
// Copyright 2020 DXOS.org
//

import { Box } from '@mui/material';
import React from 'react';

import { FullScreen } from '../../src';
import { ThemeProvider } from './ThemeProvider';

export const Container = ({ children }: { children: React.ReactNode }) => (
  <FullScreen style={{ backgroundColor: '#EEE' }}>
    <ThemeProvider>
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
    </ThemeProvider>
  </FullScreen>
);
