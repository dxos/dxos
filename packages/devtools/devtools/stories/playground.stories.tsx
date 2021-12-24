//
// Copyright 2021 DXOS.org
//

import React, { useMemo } from 'react';

import { Box, CssBaseline, ThemeProvider, useTheme } from '@mui/material';

import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { RpcPort, createLinkedPorts } from '@dxos/rpc';

import { App, ErrorBoundary } from '../src';
import { Controls } from './helpers';

export default {
  title: 'devtools/Playground'
};

const DevTools = ({ port }: { port: RpcPort }) => {
  const theme = useTheme();

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ClientProvider
          config={{
            system: {
              remote: true
            }
          }}
          options={{
            rpcPort: port
          }}
        >
          <App />
        </ClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

// TODO(burdon): ErrorBoundary with indicator.
export const Primary = () => {
  return (
    <FullScreen sx={{ alignItems: 'center', backgroundColor: '#EEE' }}>
      <ClientProvider>
        <Controls />
      </ClientProvider>
    </FullScreen>
  );
};

export const Secondary = () => {
  const [controlsPort, devtoolsPort] = useMemo(() => createLinkedPorts(), []);

  return (
    <FullScreen sx={{ flexDirection: 'row' }}>
      <DevTools port={devtoolsPort} />

      <ClientProvider
        config={
          {
            services: {
              signal: {
                // TODO(burdon): Move to config (overdependent on enterprise).
                server: 'wss://enterprise.kube.dxos.network/dxos/signal'
              }
            }
          }
        }
      >
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          <Controls port={controlsPort} />
        </Box>
      </ClientProvider>
    </FullScreen>
  );
};
