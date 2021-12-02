//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';

import { ClientProvider, useClient } from '../src';
import { ClientPanel, ThemeProvider } from './helpers';

export default {
  title: 'react-client/ClientProvider'
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
      <ClientProvider>
        <TestApp />
      </ClientProvider>
    </ThemeProvider>
  );
};
