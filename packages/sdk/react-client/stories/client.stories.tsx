//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';

import { ClientInitializer, ErrorBoundary, useClient } from '../src';
import { ClientPanel, ThemeProvider } from './helpers';

export default {
  title: 'react-client/ClientInitializer'
};

const TestApp = () => {
  const client = useClient();

  useEffect(() => {
    setImmediate(async () => {
      await client.halo.createProfile({ username: 'Test' });
    });
  }, []);

  return (
    <ClientPanel client={client} />
  );
};

export const Primary = () => {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ClientInitializer config={{ swarm: { signal: undefined } }}>
          <TestApp />
        </ClientInitializer>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
