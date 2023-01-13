//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Client, DEFAULT_CLIENT_ORIGIN, fromHost, fromIFrame } from '@dxos/client';
import { ClientServicesProvider } from '@dxos/client-services';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { useTelemetry } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContext } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components-deprecated';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

const DEFAULT_TARGET = `vault:${DEFAULT_CLIENT_ORIGIN}`;

const Telemetry = () => {
  useTelemetry({ namespace: 'devtools', router: false });
  return null;
};

export const App = () => {
  const [client, setClient] = useState<Client>();
  const [servicesProvider, setServicesProvider] = useState<ClientServicesProvider>();

  const onConfigChange = async ({ remoteSource = '' }: { remoteSource?: string } = {}) => {
    if (client && client?.config.values.runtime?.client?.remoteSource === remoteSource) {
      return;
    }

    const remoteSourceConfig = {
      runtime: {
        client: {
          remoteSource
        }
      }
    };

    const config = new Config(remoteSourceConfig, await Dynamics(), Defaults());

    if (client && servicesProvider) {
      setClient(undefined);
      setServicesProvider(undefined);
      await client.destroy();
      await servicesProvider.close();
    }

    const newServicesProvider = config.values.runtime?.client?.remoteSource ? fromIFrame(config) : fromHost(config);
    const newClient = new Client({ config, services: newServicesProvider });
    await newClient.initialize();

    setServicesProvider(newServicesProvider);
    setClient(newClient);
  };

  useAsyncEffect(async () => {
    const targetResolvers: Record<string, (remoteSource?: string) => Promise<void>> = {
      local: () => onConfigChange(),
      vault: (remoteSource) => {
        if (!remoteSource) {
          throw new Error('Vault URL is required target=vault:<vault URL>');
        }
        return onConfigChange({ remoteSource });
      }
    };

    const searchParams = new URLSearchParams(window.location.search);
    const target = searchParams.get('target') ?? DEFAULT_TARGET;
    const [protocol, ...rest] = target.split(':');
    const remoteSource = rest.join(':');
    if (!(protocol in targetResolvers)) {
      throw new Error(`Unknown target: ${target}. Available targets are: ${Object.keys(targetResolvers).join(', ')}`);
    }
    await targetResolvers[protocol](remoteSource);
  }, []);

  if (!client) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen>
          <ClientContext.Provider value={{ client, services: servicesProvider?.services }}>
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
