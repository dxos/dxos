//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { Client } from '@dxos/client';
import { initializeDevtools } from '@dxos/devtools';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { RpcPort } from '@dxos/rpc';

const log = debug('dxos:extension:sandbox');

const clientReady = new Event<Client>();

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
  new Promise<void>((resolve) => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (typeof message !== 'object' || message === null || message.source !== 'panel') {
        return;
      }

      if (message.data === 'open-rpc') {
        log('Panel RPC port ready.');
        window.removeEventListener('message', handler);
        resolve();
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

  log('Initialize client RPC server starting...');
  const rpcPort = windowPort();
  const client = new Client(
    {
      runtime: {
        client: {
          mode: Runtime.Client.Mode.REMOTE
        },
        // TODO(wittjosiah): Missing config in local client should fallback to remote client.
        services: {
          dxns: {
            server: 'wss://node1.devnet.dxos.network/dxns/ws'
          }
        }
      }
    },
    { rpcPort }
  );

  await waitForRpc();
  await client.initialize();
  log('Initialized client RPC server finished.');
  clientReady.emit(client);
};

void init();
