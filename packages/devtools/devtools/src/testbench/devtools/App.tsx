//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { appkitTranslations, Fallback } from '@dxos/react-appkit';
import { ClientContext } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { DevtoolsContextProvider, useProxiedClient, useRoutes } from '../../hooks';

const Routes = () => {
  return useRoutes();
};

export const App = () => {
  const client = useProxiedClient();
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
              <Routes />
            </HashRouter>
          </DevtoolsContextProvider>
        </ClientContext.Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
