//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Client, fromDefaults, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Controls, PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const REMOTE_CLIENT = false;

export const App = () => {
  const [clientProvider, setClientProvider] = useState<Promise<Client>>();

  const handleRemoteSource = async (remoteSource?: string) => {
    const config = new Config(await Dynamics(), Defaults(), {
      runtime: {
        client: {
          remoteSource
        }
      }
    });
    const client = new Client({ config, services: remoteSource ? fromIFrame(config) : fromDefaults(config) });
    setClientProvider(async () => {
      await client.initialize();
      return client;
    });
  };

  useEffect(() => {
    void handleRemoteSource(REMOTE_CLIENT ? 'http://localhost:3967/headless.html' : undefined);
  }, []);

  if (!clientProvider) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen sx={{ flexDirection: 'row' }}>
          <ClientProvider client={clientProvider}>
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <PanelsContainer sections={sections} />
            </Box>

            <Box sx={{ display: 'flex', flexShrink: 0 }}>
              <Controls onRemoteSource={handleRemoteSource} />
            </Box>
          </ClientProvider>
        </FullScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
