//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import App from './App';
import Provider from './Provider';
import { DevtoolsBridge } from './bridge';
import { ErrorBoundary } from './components/ErrorBoundary';

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
  connect(cb: (bridge: DevtoolsBridge) => void): void;
  onReload(cb: () => void): void;
}

export const initApp = (shell: Shell) => {
  shell.connect(bridge => {
    ReactDOM.render(
      <ErrorBoundary>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          <Provider bridge={bridge}>
            <App />
          </Provider>
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
