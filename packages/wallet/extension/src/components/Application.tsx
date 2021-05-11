import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader';
import logo from '@assets/images/dxos.png';
import {createKeyPair} from '@dxos/crypto'
import {ClientProvider} from '@dxos/react-client'
import {Client} from '@dxos/client'
import Home from './Home';

type Props = {
  title: string;
  version: string;
};

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
    return <p>'Loading...'</p>
  }

  return (
    <ClientProvider client={client}>
      <Home/>
    </ClientProvider>
  );
};

export default hot(module)(Application);
