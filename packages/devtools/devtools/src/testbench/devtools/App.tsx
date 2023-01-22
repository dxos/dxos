//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { ClientContext } from '@dxos/react-client';
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
    <ErrorBoundary>
      <ClientContext.Provider value={client}>
        <DevtoolsContextProvider>
          <HashRouter>
            <Routes />
          </HashRouter>
        </DevtoolsContextProvider>
      </ClientContext.Provider>
    </ErrorBoundary>
  );
};
