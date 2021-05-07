//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { CircularProgress } from '@material-ui/core';

import { Client, ClientConfig } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

export interface ClientInitializerProps {
  config?: ClientConfig
  children?: ReactNode
}

export const ClientInitializer = ({ children, config }: ClientInitializerProps) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client(config);
      await client.initialize();
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
