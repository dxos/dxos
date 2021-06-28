//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { ClientInitializer } from '@dxos/react-client';
import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import { CssBaseline } from '@material-ui/core';

import Root from './components/Root';
import { ReactUXTheme } from '@dxos/react-ux';
import { initConfig } from './config';


const baseTheme = createMuiTheme({
  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          margin: 0,
          overflow: 'hidden',
        },
      },
    },
  },
  sidebar: {
    width: 300,
  },
});

/**
 * Root container.
 */
const App = () => {
  return (
    <ClientInitializer config={initConfig}>
      <ReactUXTheme base={baseTheme}>
        <ThemeProvider theme={baseTheme}>
          <CssBaseline />
          <Root />
        </ThemeProvider>
      </ReactUXTheme>
    </ClientInitializer>
  );
}

export default App;
