//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import Home from './Home';

const Application = () => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client();
      await client.initialize();
      setClient(client);
    });
  }, []);

  if (!client) {
    return <p>Loading...</p>;
  }

  return (
    <ClientProvider client={client}>
      <Home />
    </ClientProvider>
  );
};

export default Application;
