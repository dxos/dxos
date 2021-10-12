//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';

import { ClientInitializer, useClient } from '../src';
import { ClientPanel } from './helpers';

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
    <ClientInitializer config={{ swarm: { signal: undefined } }}>
      <TestApp />
    </ClientInitializer>
  );
};
