//
// Copyright 2020 DXOS.org
//

// import * as Integrations from '@sentry/integrations';
// import * as Sentry from '@sentry/react';
import React from 'react';

import { ClientInitializer } from '@dxos/react-client';
import { CssBaseline, ThemeProvider, createMuiTheme } from '@material-ui/core';

import config from './config';
import Root from './components/Root';
import { ReactUXTheme } from '@dxos/react-ux';

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
 * @param config
 */
function App() {
  return (
    <ClientInitializer config={config}>
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
