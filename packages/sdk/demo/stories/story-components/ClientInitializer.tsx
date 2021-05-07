//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { CircularProgress } from '@material-ui/core';

import { Client, ClientConfig } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { createKeyPair } from '@dxos/crypto';

export interface ClientInitializerProps {
  config?: ClientConfig
  children?: ReactNode
  initProfile?: boolean
}

export const ClientInitializer = ({ children, config, initProfile }: ClientInitializerProps) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client(config);
      await client.initialize();

      if (initProfile && !client.getProfile()) {
        client.createProfile(createKeyPair())
      }

      setClient(client);
    });
  }, []);

  if (!client) {
    return <CircularProgress />;
  }

  return (
    <ClientProvider client={client}>
      {children}
    </ClientProvider>
  );
};
