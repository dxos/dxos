//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createMuiTheme } from '@material-ui/core/styles';

import { ClientInitializer } from '@dxos/react-client';
import { ReactUXTheme, ErrorView } from '@dxos/react-ux';

import Root from './components/Root';
import { initConfig } from './config';

const baseTheme = createMuiTheme({
  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          margin: 0,
          overflow: 'hidden'
        }
      }
    }
  },
  sidebar: {
    width: 300
  }
});

// import client initializer and error boundary

/**
 * Root container.
 */
const App = () => {

  const handleError = (error, errorInfo) => {
    // Here you can handle the errors
  };

  return (
    <ClientInitializer config={initConfig} onError={handleError} errorComponent={ErrorView}>
      <ReactUXTheme base={baseTheme}>
        <Root />
      </ReactUXTheme>
    </ClientInitializer>
  );
};

export default App;
