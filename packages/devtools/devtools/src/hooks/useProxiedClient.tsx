//
// Copyright 2023 DXOS.org
//

import { useState } from 'react';

import { Client } from '@dxos/client';
import { ClientServicesProxy } from '@dxos/client-services';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContextProps } from '@dxos/react-client';
import { RpcPort } from '@dxos/rpc';

/**
 * Creates Client with services opened on window.__DXOS__ hook.
 */
export const useProxiedClient = () => {
  const [client, setClient] = useState<ClientContextProps>();
  useAsyncEffect(async () => {
    const { client, services } = await createClientContext();
    setClient({ client, services });
  }, []);

  return client;
};

const createClientContext = async () => {
  const port: RpcPort = {
    send: async (message) =>
      window.parent.postMessage(
        {
          data: Array.from(message),
          source: 'content-script' // content-script is required for RPC port to work because services port on window.__DXOS__ hook expect such source.
        },
        '*'
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
    }
  };

  const servicesProvider = new ClientServicesProxy(port);
  const client = new Client({ services: servicesProvider });
  await client.initialize();

  // TODO(burdon): Why returning services if set in client?
  return { client, services: servicesProvider.services };
};
