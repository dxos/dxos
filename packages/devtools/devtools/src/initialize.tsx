//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { ClientContext } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { PanelsContainer } from './containers';
import { sections } from './sections';

export type ClientAndServices = { client: Client; services: ClientServices };

export const Devtools = ({ clientReady }: { clientReady: Event<ClientAndServices> }) => {
  const [value, setValue] = useState<ClientAndServices>();

  useEffect(() => {
    clientReady.on((value) => setValue(value));
  }, []);

  return (
    <ErrorBoundary>
      {value && (
        <ClientContext.Provider value={value}>
          <PanelsContainer sections={sections} />
        </ClientContext.Provider>
      )}
    </ErrorBoundary>
  );
};

export const initializeDevtools = (clientReady: Event<ClientAndServices>) => {
  createRoot(document.getElementById('root')!).render(<Devtools clientReady={clientReady} />);
};
