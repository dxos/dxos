//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { appkitTranslations, Fallback, useTelemetry } from '@dxos/react-appkit';
import { ClientContext } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { DevtoolsContextProvider, useRemoteClient, useRoutes } from '../hooks';

const Routes = () => {
  return useRoutes();
};

const Telemetry = () => {
  useTelemetry({ namespace: 'devtools', router: false });
  return null;
};

// TODO(burdon): Refactor with Devtools.tsx?
export const App = () => {
  const client = useRemoteClient();
  if (!client) {
    return null;
  }

  return (
    <ThemeProvider
      appNs='devtools'
      resourceExtensions={[appkitTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ErrorBoundary>
        <ClientContext.Provider value={client}>
          <DevtoolsContextProvider>
            <HashRouter>
              <Telemetry />
              <Routes />
            </HashRouter>
          </DevtoolsContextProvider>
        </ClientContext.Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
