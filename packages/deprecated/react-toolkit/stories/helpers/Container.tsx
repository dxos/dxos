//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import { Box } from '@mui/material';

import { FullScreen } from '@dxos/react-components';

import { ErrorBoundary } from '../../src';

export const Container = ({ children }: { children: ReactNode }) => (
  <FullScreen style={{ backgroundColor: '#EEE' }}>
    <ErrorBoundary>
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
    </ErrorBoundary>
  </FullScreen>
);
