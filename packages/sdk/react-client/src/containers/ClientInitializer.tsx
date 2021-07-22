//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { LinearProgress } from '@material-ui/core';

import { Client, ClientConfig } from '@dxos/client';

import ClientProvider from './ClientProvider';

interface ClientInitializerProperties {
  children?: ReactNode
  config?: ClientConfig | Function
}

/**
 * Initializes and provides a client instance given a config object or config generator.
 * To be used with `useClient` hook.
 */
const ClientInitializer = ({ children, config = {} }: ClientInitializerProperties) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client(typeof config === 'function' ? await config() : config);
      await client.initialize();

      setClient(client);
    });
  }, []);

  if (!client) {
    return <LinearProgress />;
  }

  return (
    <ClientProvider client={client}>
      {children}
    </ClientProvider>
  );
};

export default ClientInitializer;
