//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Client } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { Controls } from './Controls';

export default {
  title: 'Controls'
};

const initClient = async () => {
  const client = new Client();
  await client.initialize();
  return client;
};

// TODO(burdon): ErrorBoundary with indicator.
export const Primary = () => {
  const [client, setClient] = useState<Client>();

  useAsyncEffect(async () => {
    const client = await initClient();
    setClient(client);
  }, []);

  const onConfigChange = async (params: { remoteSource?: string }) => {
    console.log(params);

    // Create new client instance on remote source change to simulate typical usage.
    const client = await initClient();
    setClient(client);
  };

  return (
    <FullScreen sx={{ alignItems: 'center', backgroundColor: '#EEE' }}>
      <ClientProvider client={client}>
        <Controls onConfigChange={onConfigChange} />
      </ClientProvider>
    </FullScreen>
  );
};
