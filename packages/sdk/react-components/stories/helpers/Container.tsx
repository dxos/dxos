//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import { Box } from '@mui/material';

import { FullScreen } from '../../src/index.js';
import { ThemeProvider } from './ThemeProvider.js';

export const Container = ({ children }: { children: ReactNode }) => (
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
