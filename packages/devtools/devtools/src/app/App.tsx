//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { useTelemetry } from '@dxos/react-appkit';
import { ClientContext } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { useRemoteClient, useRoutes } from '../hooks';

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
    <ErrorBoundary>
      <ClientContext.Provider value={client}>
        <HashRouter>
          <Telemetry />
          <Routes />
        </HashRouter>
      </ClientContext.Provider>
    </ErrorBoundary>
  );
};
