//
// Copyright 2023 DXOS.org
//

import { useState } from 'react';

import { Client, ClientServicesProxy } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { type RpcPort } from '@dxos/rpc';

/**
 * Creates Client with services opened on parent window.__DXOS__ hook.
 */
export const useProxiedClient = () => {
  const [client, setClient] = useState<Client>();
  useAsyncEffect(async () => {
    const client = await createClientProxy();
    setClient(client);
  }, []);

  return client;
};

const createClientProxy = async () => {
  const port: RpcPort = {
    send: async (message) =>
      window.parent.postMessage(
        {
          data: Array.from(message),
          source: 'content-script', // content-script is required for RPC port to work because services port on window.__DXOS__ hook expect such source.
        },
        '*',
      ),
    subscribe: (callback) => {
      const handler = (event: MessageEvent<any>) => {
        const message = event.data;
        if (typeof message !== 'object' || message === null || message.source !== 'dxos-client') {
          return;
        }

        callback(new Uint8Array(message.data));
      };

      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
  };

  const services = new ClientServicesProxy(port);
  const client = new Client({ services });
  await client.initialize();
  return client;
};
