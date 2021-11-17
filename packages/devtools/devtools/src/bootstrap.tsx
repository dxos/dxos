//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { createTheme as createMuiTheme, ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';

import { App } from './App';
import { ErrorBoundary } from './components';
import { DevtoolsContent } from './hooks';
import { DevtoolsHost } from './proto';

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
  connect(cb: (devtoolsHost: DevtoolsHost) => void): void;
  onReload(cb: () => void): void;
}

export const initialize = (shell: Shell) => {
  shell.connect(devtoolsHost => {
    ReactDOM.render(
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <DevtoolsContent.Provider value={devtoolsHost}>
            <App />
          </DevtoolsContent.Provider>
        </ThemeProvider>
      </ErrorBoundary>,
      document.getElementById('root')
    );
  });

  shell.onReload(() => {
    window.location.reload();
  });
};
