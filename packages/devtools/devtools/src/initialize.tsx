//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { ClientContext } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Loader } from './components';
import { PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

export type ClientAndServices = { client: Client; services: ClientServices }

const Devtools = ({ clientReady }: { clientReady: Event<ClientAndServices> }) => {
  const [value, setValue] = useState<ClientAndServices>();

  useEffect(() => {
    clientReady.on((value) => setValue(value));
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen>
          <Loader loading={!value} label='Loading DXOS Client...' />
          {value && (
            <ClientContext.Provider value={value}>
              <PanelsContainer sections={sections} />
            </ClientContext.Provider>
          )}
        </FullScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export const initializeDevtools = (clientReady: Event<ClientAndServices>) => {
  createRoot(document.getElementById('root')!).render(<Devtools clientReady={clientReady} />);
};
