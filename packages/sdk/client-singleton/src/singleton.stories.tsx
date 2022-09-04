//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Client } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';

export default {
  title: 'client/singleton'
};

export const Primary = () => {
  const [client, setClient] = useState<Client>();

  useAsyncEffect(async () => {
    const client = new Client();
    await client.initialize();
    setClient(client);
  }, []);

  if (!client) {
    return null;
  }

  return (
    <pre>
      {JSON.stringify({
        initialized: client.initialized,
        ...(client.initialized ? client.info : {})
      })}
    </pre>
  );
};
