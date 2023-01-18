//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServicesProxy } from '@dxos/client-services';
import { ClientAndServices, Devtools } from '@dxos/devtools';
import { useAsyncEffect } from '@dxos/react-async';
import { RpcPort } from '@dxos/rpc';

const connectToClient = async () => {
  const port: RpcPort = {
    send: async (message) =>
      window.parent.postMessage(
        {
          data: Array.from(message),
          source: 'content-script' // This is required for dxos-client port to work.
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
  return { client, services: servicesProvider.services };
};

export const App = () => {
  const clientReady = new Event<ClientAndServices>();
  useAsyncEffect(async () => {
    const { client, services } = await connectToClient();
    clientReady.emit({ client, services });
  }, []);
  return <Devtools clientReady={clientReady} />;
};
