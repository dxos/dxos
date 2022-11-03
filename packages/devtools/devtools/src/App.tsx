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

import { Controls, PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const REMOTE_CLIENT = false;

export const App = () => {
  const [clientProvider, setClientProvider] = useState<Promise<Client>>();

  const handleRemoteSource = async (remoteSource?: string) => {
    const remoteSourceConfig = remoteSource
      ? {
          runtime: {
            client: {
              remoteSource
            }
          }
        }
      : {
          runtime: {
            client: {
              mode: 1
            }
          }
        };
    const config = new Config(await Dynamics(), Defaults(), remoteSourceConfig);
    const client = new Client(config);
    setClientProvider(async () => {
      await client.initialize();
      return client;
    });
  };

  useEffect(() => {
    let remoteSource: string | undefined;
    if (REMOTE_CLIENT) {
      remoteSource = 'http://localhost:3967/headless.html';
    }
    void handleRemoteSource(remoteSource!);
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
