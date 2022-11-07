//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContext } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Controls, PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const REMOTE_CLIENT = true;
const HEADLESS_SOURCE = 'http://localhost:3967/headless.html';

export const App = () => {
  const [client, setClient] = useState<Client>();

  const onSource = async ({ remoteSource, mode }: { remoteSource?: string; mode: number }) => {
    const remoteSourceConfig = {
      runtime: {
        client: {
          remoteSource,
          mode
        }
      }
    };
    const config = new Config(remoteSourceConfig, await Dynamics(), Defaults());
    {
      const newClient = new Client(config);
      await newClient.initialize();
      setClient(newClient);
    }
  };

  useAsyncEffect(async () => {
    await onSource({
      remoteSource: REMOTE_CLIENT ? HEADLESS_SOURCE : undefined,
      mode: REMOTE_CLIENT ? 2 : 1
    });
  }, []);

  if (!client) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen sx={{ flexDirection: 'row' }}>
          <ClientContext.Provider value={{ client }}>
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <PanelsContainer sections={sections} />
            </Box>

            <Box sx={{ display: 'flex', flexShrink: 0 }}>
              <Controls onSource={onSource} />
            </Box>
          </ClientContext.Provider>
        </FullScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
