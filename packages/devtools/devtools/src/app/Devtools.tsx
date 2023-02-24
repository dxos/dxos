//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { ClientServices } from '@dxos/client-services';
import { appkitTranslations, Fallback, useTelemetry } from '@dxos/react-appkit';
import { Client, ClientContext } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { DevtoolsContextProvider, useRoutes } from '../hooks';

const Routes = () => {
  return useRoutes();
};

const Telemetry = () => {
  useTelemetry({ namespace: 'devtools', router: false });
  return null;
};

// Entry point that does not have opinion on Client, so it can be reused in extension.
export const Devtools = ({ client }: { client?: { client: Client; services?: ClientServices } }) => {
  const fallback = <Fallback message='Loading...' />;

  return (
    <ThemeProvider appNs='devtools' resourceExtensions={[appkitTranslations]} fallback={fallback}>
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
