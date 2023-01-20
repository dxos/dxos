//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { ClientContext } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Routes } from './containers';

export type ClientAndServices = { client: Client; services: ClientServices };

// TODO(burdon): Refactor with App.tsx
// TODO(burdon): React.StrictMode?
// TODO(burdon): Error page.

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

export const initializeDevtools = (clientReady: Event<ClientAndServices>) => {
  createRoot(document.getElementById('root')!).render(<Devtools clientReady={clientReady} />);
};
