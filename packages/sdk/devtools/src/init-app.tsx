//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WithDevtoolsHostContext } from './contexts';
import { DevtoolsHost } from './proto';

const theme = createMuiTheme({
  typography: {
    fontSize: 10
  },
  props: {
    MuiButtonBase: {
      disableRipple: true
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
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          <WithDevtoolsHostContext devtoolsHost={devtoolsHost}>
            <App />
          </WithDevtoolsHostContext>
        </MuiThemeProvider>
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
