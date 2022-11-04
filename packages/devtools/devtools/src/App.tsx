//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Controls, PanelsContainer, ConfigSource } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const REMOTE_CLIENT = false;

export const App = () => {
  const [clientProvider, setClientProvider] = useState<Promise<Client>>();

  const onSource = async ({ remoteSource, mode }: { remoteSource?: string; mode: number }) => {
    const remoteSourceConfig = {
      runtime: {
        client: {
          remoteSource,
          mode
        }
      }
    };
    const config = new Config(remoteSourceConfig, Defaults());
    console.log('dynamic config', await Dynamics());
    console.log('defaults config', Defaults());
    console.log('remoteSourceConfig', remoteSourceConfig);
    const client = new Client(config);
    setClientProvider(async () => {
      await client.initialize();
      return client;
    });
  };

  useEffect(() => {
    void onSource({
      remoteSource: REMOTE_CLIENT ? 'http://localhost:3967/headless.html' : undefined,
      mode: REMOTE_CLIENT ? 2 : 1
    });
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
              <Controls onSource={onSource} />
            </Box>
          </ClientProvider>
        </FullScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
