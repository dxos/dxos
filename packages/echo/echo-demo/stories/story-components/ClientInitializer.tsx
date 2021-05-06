//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { CircularProgress } from '@material-ui/core';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

export const ClientInitializer = ({ children }: {children?: ReactNode}) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client();
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
