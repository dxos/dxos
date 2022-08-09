//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';
import { createBundledRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

import { Client } from '../client';
import { clientServiceBundle } from '../packlets/api';
import { SingletonMessage } from '../packlets/proxy';

const windowPort = (): RpcPort => ({
  send: async message => window.parent.postMessage({
    data: Array.from(message),
    type: SingletonMessage.CLIENT_MESSAGE
  }, '*'),
  subscribe: callback => {
    const handler = (event: MessageEvent<any>) => {
      const message = event.data;
      if (
        typeof message !== 'object' ||
          message === null ||
          message.type !== SingletonMessage.APP_MESSAGE
      ) {
        return;
      }

      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

const serviceWorkerPort = (sendPort: MessagePort, sourceId: string): RpcPort => ({
  send: async message => sendPort.postMessage({
    type: SingletonMessage.CLIENT_MESSAGE,
    sourceId,
    data: Array.from(message)
  }),
  subscribe: callback => {
    activeProxies.set(sourceId, callback);
    return () => activeProxies.delete(sourceId);
  }
});

let client: Client;
let server: RpcPeer;
const activeProxies = new Map<string, (msg: Uint8Array) => void>();

if ('serviceWorker' in navigator) {
  void (async () => {
    // TODO(wittjosiah): Ensure two instances starting up simultaneously results in a single host instance.
    const worker = new SharedWorker('./shared-worker.js');
    worker.port.start();

    worker.port.addEventListener('message', async event => {
      const message = event.data;
      switch (message?.type) {
        case SingletonMessage.SETUP_CLIENT: {
          const config = new Config(await Dynamics(), Defaults());
          client = new Client(config);
          await client.initialize();

          if (server) {
            server.close();
          }
          server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: windowPort()
          });

          window.addEventListener('beforeunload', () => {
            worker.port.postMessage({ type: SingletonMessage.CLIENT_CLOSING });
          });
          worker.port.postMessage({ type: SingletonMessage.CLIENT_READY });
          window.parent.postMessage({ type: SingletonMessage.CLIENT_READY }, '*');
          await server.open();
          break;
        }

        case SingletonMessage.SETUP_PORT: {
          server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: serviceWorkerPort(worker.port, message.sourceId)
          });
          worker.port.postMessage({
            type: SingletonMessage.PORT_READY,
            sourceId: message.sourceId
          });
          await server.open();
          break;
        }

        case SingletonMessage.PORT_READY: {
          window.addEventListener('message', event => {
            const message = event.data;

            if (
              typeof message !== 'object' ||
              message === null ||
              message.type !== SingletonMessage.APP_MESSAGE
            ) {
              return;
            }

            worker.port.postMessage(message);
          });
          window.parent.postMessage({ type: SingletonMessage.CLIENT_READY }, '*');
          break;
        }

        case SingletonMessage.APP_MESSAGE: {
          activeProxies.get(message.sourceId!)?.(new Uint8Array(message.data));
          break;
        }

        case SingletonMessage.CLIENT_MESSAGE: {
          window.parent.postMessage(message, '*');
          break;
        }
      }
    });
  })();
} else {
  console.error('DXOS Client singleton requires access to service workers');
}
