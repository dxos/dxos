//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';
import { createBundledRpcServer, RpcPort } from '@dxos/rpc';

import { Client } from './client';
import { clientServiceBundle } from './packlets/api';

const windowPort = (): RpcPort => ({
  send: async message => window.parent.postMessage({
    data: Array.from(message),
    source: 'client'
  }, '*'),
  subscribe: callback => {
    const handler = (event: MessageEvent<any>) => {
      const message = event.data;
      if (
        typeof message !== 'object' ||
          message === null ||
          message.source !== 'app'
      ) {
        return;
      }

      // console.log('Received message from app:', message);
      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

void (async () => {
  const config = new Config(await Dynamics(), Defaults());
  const client = new Client(config);
  await client.initialize();
  window.parent.postMessage({ data: 'ready', source: 'client' }, '*');

  const server = createBundledRpcServer({
    services: clientServiceBundle,
    handlers: client.services,
    port: windowPort()
  });

  await server.open();
})();
