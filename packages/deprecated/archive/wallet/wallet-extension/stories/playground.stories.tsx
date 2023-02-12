//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { createTheme, ThemeProvider } from '@mui/material';

import { ClientProvider } from '@dxos/react-client';

import { Main } from '../src/popup/containers/Main';
import { WithSnackbarContext } from '../src/popup/hooks/useSnackbar';

export default {
  title: 'Wallet'
};

export const Popup = () => (
  <div style={{ backgroundColor: '#ccc', width: '100vw', height: '100vh' }}>
    <div style={CONTAINER_STYLE}>
      <ThemeProvider theme={theme}>
        <ClientProvider>
          <WithSnackbarContext>
            <Main />
          </WithSnackbarContext>
        </ClientProvider>
      </ThemeProvider>
    </div>
  </div>
);

const theme = createTheme();

const CONTAINER_STYLE = {
  position: 'absolute',
  left: '50vw',
  top: '50vh',
  transform: 'translate(-50%, -50%)',
  backgroundColor: '#fff',
  margin: 0,
  overflow: 'hidden',
  width: 600,
  height: 450
} as const;
