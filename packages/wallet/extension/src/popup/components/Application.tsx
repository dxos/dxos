//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import Home from './Home';

import { browser } from "webextension-polyfill-ts";

const Application = () => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client();
      await client.initialize();
      setClient(client);
    });
  }, []);

  useEffect(() => {
    setImmediate(async () => {
      console.log('asking for profile..')
      const result = await browser.runtime.sendMessage({method: 'GetProfile'})
      console.log('received', result)
    })
  }, [])

  if (!client) {
    return <p>Loading...</p>;
  }

  return (
    <ClientProvider client={client}>
      <Home />
    </ClientProvider>
  );
};

export default hot(module)(Application);
