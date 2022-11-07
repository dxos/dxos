//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { DEFAULT_CLIENT_ORIGIN } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Controls, PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const REMOTE_CLIENT = false;

export const App = () => {
  const [configProvider, setConfigProvider] = useState<Promise<Config>>();

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
    console.log('app config', config.values);

    setConfigProvider(async () => config);
  };

  useEffect(() => {
    void onSource({
      remoteSource: REMOTE_CLIENT ? DEFAULT_CLIENT_ORIGIN : undefined,
      mode: REMOTE_CLIENT ? 2 : 1
    });
  }, []);

  if (!configProvider) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen sx={{ flexDirection: 'row' }}>
          <ClientProvider config={configProvider}>
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
