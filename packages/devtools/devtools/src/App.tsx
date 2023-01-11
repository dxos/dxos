//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Client, DEFAULT_CLIENT_ORIGIN, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { useTelemetry } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContext } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components-deprecated';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { PanelsContainer } from './containers';
import { ClientAndServices } from './initialize';
import { sections } from './sections';
import { theme } from './theme';

const DEFAULT_TARGET = `vault:${DEFAULT_CLIENT_ORIGIN}`;

const createClientAndServices = async (): Promise<ClientAndServices> => {
  /**
   * Create client from remote source.
   */
  const fromRemoteSource = async (remoteSource?: string) => {
    const remoteSourceConfig = remoteSource
      ? {
          runtime: {
            client: {
              remoteSource
            }
          }
        }
      : {};

    const config = new Config(remoteSourceConfig, await Dynamics(), Defaults());

    const servicesProvider = remoteSource ? fromIFrame(config) : fromHost(config);
    const client = new Client({ config, services: servicesProvider });
    await client.initialize();
    return { client, services: servicesProvider.services };
  };

  const targetResolvers: Record<string, (remoteSource?: string) => Promise<ClientAndServices>> = {
    local: () => fromRemoteSource(),
    vault: (remoteSource) => {
      if (!remoteSource) {
        throw new Error('Vault URL is required target=vault:<vault URL>');
      }
      return fromRemoteSource(remoteSource);
    }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('target') ?? DEFAULT_TARGET;
  const [protocol, ...rest] = target.split(':');
  const remoteSource = rest.join(':');
  if (!(protocol in targetResolvers)) {
    throw new Error(`Unknown target: ${target}. Available targets are: ${Object.keys(targetResolvers).join(', ')}`);
  }
  return targetResolvers[protocol](remoteSource);
};

const Telemetry = () => {
  useTelemetry({ namespace: 'devtools', router: false });
  return null;
};

export const App = () => {
  const [value, setValue] = useState<ClientAndServices>();

  useAsyncEffect(async () => {
    setValue(await createClientAndServices());
  }, []);

  if (!value) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen>
          <ClientContext.Provider value={value}>
            <Telemetry />

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <PanelsContainer sections={sections} />
            </Box>
          </ClientContext.Provider>
        </FullScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
