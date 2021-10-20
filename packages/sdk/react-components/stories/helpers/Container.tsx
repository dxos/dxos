//
// Copyright 2020 DXOS.org
//

import { styled, Box } from '@mui/material';
import React from 'react';

import { ThemeProvider } from './ThemeProvider';

const FullScreen = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  backgroundColor: '#EEE'
});

export const Container = ({ children }: { children: React.ReactNode }) => (
  <FullScreen>
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
