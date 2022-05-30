//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Loader } from './components';
import { PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const Main = ({ client }: { client: Client }) => (
  <ClientProvider client={client}>
    <PanelsContainer sections={sections} />
  </ClientProvider>
);

export const App = ({ clientReady }: { clientReady: Event<Client> }) => {
  const [client, setClient] = useState<Client>();

  useEffect(() => {
    clientReady.on(client => setClient(client));
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <FullScreen>
          <Loader loading={!client} label='Looking for DXOS Client...' />
        </FullScreen>

        {client && <Main client={client} />}
      </ThemeProvider>
    </ErrorBoundary>
  );
};
