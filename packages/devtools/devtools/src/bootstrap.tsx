//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { CssBaseline, ThemeProvider, colors, createTheme } from '@mui/material';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { App } from './App';
import { ErrorBoundary } from './components';

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.blueGrey[500]
    },
    secondary: {
      main: colors.teal[500]
    }
  },
  typography: {
    fontSize: 12
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    },
    MuiToolbar: {
      defaultProps: {
        disableGutters: true,
        variant: 'dense'
      },
      styleOverrides: {
        root: {
          '.MuiButton-root': {
            margin: '0 4px'
          }
        }
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
  console.log(theme);
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
