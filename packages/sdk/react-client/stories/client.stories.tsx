//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';

import { ClientProvider, useClient } from '../src';
import { ClientPanel } from './helpers';

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
    <ClientProvider>
      <TestApp />
    </ClientProvider>
  );
};

export const Secondary = () => {
  return (
    <ClientProvider config={() => ({})}>
      <TestApp />
    </ClientProvider>
  );
};
