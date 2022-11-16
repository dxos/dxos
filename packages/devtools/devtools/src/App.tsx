//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { Client, fromDefaults, fromIFrame } from '@dxos/client';
import { ClientServicesProvider } from '@dxos/client-services';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContext } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { Controls, PanelsContainer } from './containers';
import { sections } from './sections';
import { useTelemetry } from './telemetry';
import { theme } from './theme';

const Telemetry = () => {
  useTelemetry();
  return null;
};

export const App = () => {
  const [client, setClient] = useState<Client>();
  const [servicesProvider, setServicesProvider] = useState<ClientServicesProvider>();

  const onConfigChange = async (remoteSource?: string) => {
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

    {
      if (client && servicesProvider) {
        setClient(undefined);
        await client.destroy();
        await servicesProvider.close();
      }
      const newServicesProvider = remoteSource ? fromIFrame(config) : fromDefaults(config);
      setServicesProvider(newServicesProvider);
      const newClient = new Client({ config, services: newServicesProvider });
      await newClient.initialize();
      setClient(newClient);
    }
  };

  useAsyncEffect(async () => {
    await onConfigChange();
  }, []);

  if (!client) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FullScreen sx={{ flexDirection: 'row' }}>
          <ClientContext.Provider value={{ client, services: servicesProvider?.services, services: servicesProvider?.services }}>
            <Telemetry />
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <PanelsContainer sections={sections} />
            </Box>

            <Box sx={{ display: 'flex', flexShrink: 0 }}>
              <Controls onConfigChange={onConfigChange} />
            </Box>
          </ClientContext.Provider>
        </FullScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
