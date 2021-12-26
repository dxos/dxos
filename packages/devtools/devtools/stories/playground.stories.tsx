//
// Copyright 2021 DXOS.org
//

import React, { useMemo } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { RpcPort, createLinkedPorts } from '@dxos/rpc';

import { App, ErrorBoundary, theme } from '../src';
import { Controls } from './helpers';

export default {
  title: 'devtools/Playground'
};

const DevTools = ({ port }: { port: RpcPort }) => {
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
  const config = {
    services: {
      signal: {
        // TODO(burdon): Fallback.
        server: 'wss://enterprise.kube.dxos.network/dxos/signal'
        // server: 'ws://localhost:4000'
      }
    }
  };

  return (
    <FullScreen sx={{ flexDirection: 'row' }}>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <DevTools port={devtoolsPort} />
      </Box>

      <ClientProvider config={config}>
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          <Controls port={controlsPort} />
        </Box>
      </ClientProvider>
    </FullScreen>
  );
};
