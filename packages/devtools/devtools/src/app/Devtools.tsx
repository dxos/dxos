//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { ClientContext } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { useRoutes } from '../hooks';

// TODO(burdon): Replace with dxos/client definition?
export type ClientAndServices = { client: Client; services: ClientServices };

const Routes = () => {
  return useRoutes();
};

// TODO(burdon): Refactor with main App.tsx?
export const Devtools = ({ clientReady }: { clientReady: Event<ClientAndServices> }) => {
  const [client, setClient] = useState<ClientAndServices>();
  useEffect(() => {
    clientReady.on((value) => setClient(value));
  }, []);

  return (
    <ErrorBoundary>
      {client && (
        <ClientContext.Provider value={client}>
          <HashRouter>
            <Routes />
          </HashRouter>
        </ClientContext.Provider>
      )}
    </ErrorBoundary>
  );
};
