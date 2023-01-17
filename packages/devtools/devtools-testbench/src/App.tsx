//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Event, sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { ClientServicesProxy } from '@dxos/client-services';
import { ClientAndServices, Devtools } from '@dxos/devtools';
// eslint-disable-next-line no-restricted-imports
import { Root as KaiPart } from '@dxos/kai/src/Root';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { RpcPort } from '@dxos/rpc';

const waitForDXOS = async (timeout = 100000, interval = 1000) => {
  while (timeout > 0) {
    const isReady = !!(window as any).__DXOS__;
    if (isReady) {
      return;
    }

    log('DXOS hook not yet available...');
    await sleep(interval);
    timeout -= interval;
  }

  throw new Error('DXOS hook not available.');
};

const connectToClient = async () => {
  await waitForDXOS();
  (window as any).__DXOS__.openClientRpcServer();
  const port: RpcPort = {
    send: async (message) =>
      window.postMessage(
        {
          data: Array.from(message),
          source: 'content-script'
        },
        '*'
      ),

    subscribe: (callback) => {
      const handler = (event: MessageEvent<any>) => {
        if (event.source !== window) {
          return;
        }

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

const DevtoolsPart = () => {
  const clientReady = new Event<ClientAndServices>();
  useAsyncEffect(async () => {
    const { client, services } = await connectToClient();
    clientReady.emit({ client, services });
  }, []);

  return <Devtools clientReady={clientReady} />;
};

/**
 * Main app container with routes.
 */
export const App = () => {
  return (
    <div className='h-screen w-full grid grid-rows-2 grid-flow-col gap-4'>
      <div className='h-1/2'>
        <KaiPart />
      </div>
      <div className='h-1/2'>
        <DevtoolsPart />
      </div>
    </div>
  );
};
