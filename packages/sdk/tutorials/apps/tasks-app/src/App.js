//
// Copyright 2020 DXOS.org
//

// import * as Integrations from '@sentry/integrations';
// import * as Sentry from '@sentry/react';
import React from 'react';

import { CssBaseline } from '@material-ui/core';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

import { ClientInitializer } from '@dxos/react-client';

import config from './config';
import Root from './components/Root';

// if (config.sentry) {
//   Sentry.init({
//     dsn: config.sentry.dns,
//     environment: config.sentry.environment || process.env.NODE_ENV,
//     release: 'tutorials@' + process.env.GIT_COMMIT_HASH,
//     integrations: [
//       new Integrations.CaptureConsole({
//         levels: ['error']
//       })
//     ]
//   });
// }

const theme = createMuiTheme({
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
 * @param config
 */
function App() {
  return (
    <ClientInitializer config={config}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Root />
      </ThemeProvider>
    </ClientInitializer>
  );
}

export default App;
