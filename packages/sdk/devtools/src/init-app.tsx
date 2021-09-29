//
// Copyright 2020 DXOS.org
//

import { createTheme as createMuiTheme, ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WithDevtoolsHostContext } from './contexts';
import { DevtoolsHost } from './proto';

const theme = createMuiTheme({
  typography: {
    fontSize: 10
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

export const initApp = (shell: Shell) => {
  shell.connect(devtoolsHost => {
    ReactDOM.render(
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <WithDevtoolsHostContext devtoolsHost={devtoolsHost}>
            <App />
          </WithDevtoolsHostContext>
        </ThemeProvider>
      </ErrorBoundary>,
      document.getElementById('root')
    );
  });
};

export const initDevTool = (shell: Shell) => {
  initApp(shell);
  shell.onReload(() => {
    window.location.reload();
  });
};
