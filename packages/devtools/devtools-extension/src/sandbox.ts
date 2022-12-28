//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { ClientServices, ClientServicesProxy } from '@dxos/client-services';
import { initializeDevtools } from '@dxos/devtools';
import { RpcPort } from '@dxos/rpc';

const log = debug('dxos:extension:sandbox');

const clientReady = new Event<{ client: Client; services: ClientServices }>();

const windowPort = (): RpcPort => ({
  send: async (message) =>
    window.parent.postMessage(
      {
        data: Array.from(message),
        source: 'sandbox'
      },
      window.location.origin
    ),
  subscribe: (callback) => {
    const handler = (event: MessageEvent<any>) => {
      const message = event.data;
      if (typeof message !== 'object' || message === null || message.source !== 'panel') {
        return;
      }

      log('Received message from panel:', message);
      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

const waitForRpc = async () =>
  new Promise<Config>((resolve) => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      console.log('SANDBOX Received message from panel:', message);
      if (typeof message !== 'object' || message === null || message.source !== 'panel') {
        return;
      }

      if (message.data === 'open-rpc') {
        log('Panel RPC port ready.');
        window.removeEventListener('message', handler);
        resolve(message);
      }
    };

    window.addEventListener('message', handler);

    log('Sandbox RPC port ready.');

    window.parent.postMessage(
      {
        data: 'open-rpc',
        source: 'sandbox'
      },
      window.location.origin
    );
  });

const init = async () => {
  initializeDevtools(clientReady);

  console.log('Initialize client RPC server starting...');
  const rpcPort = windowPort();
  const servicesProvider = new ClientServicesProxy(rpcPort);

  // TODO(mykola): Catch config from the panel.
  await waitForRpc();

  const client = new Client({
    config: new Config({
      runtime: {
        services: {
          dxns: {
            server: 'wss://node1.devnet.dxos.network/dxns/ws'
          }
        }
      }
    }),
    services: servicesProvider
  });

  await client.initialize();
  log('Initialized client RPC server finished.');
  clientReady.emit({ client, services: servicesProvider.services });
};

void init();
