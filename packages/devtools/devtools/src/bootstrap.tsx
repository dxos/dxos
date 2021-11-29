//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { CssBaseline, ThemeProvider, createTheme as createMuiTheme } from '@mui/material';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { App } from './App';
import { ErrorBoundary } from './components';

const theme = createMuiTheme({
  typography: {
    fontSize: 11
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    }
  }
});

export interface Shell {
  tabId: number,
  connect(cb: (client: Client) => void): void;
  onReload(cb: () => void): void;
}

export const initialize = (shell: Shell) => {
  shell.connect(client => {
    ReactDOM.render(
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ClientProvider client={client}>
            <App />
          </ClientProvider>
        </ThemeProvider>
      </ErrorBoundary>,
      document.getElementById('root')
    );
  });

  shell.onReload(() => {
    window.location.reload();
  });
};
