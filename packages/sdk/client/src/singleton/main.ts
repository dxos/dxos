//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';
import { createBundledRpcServer, RpcPort } from '@dxos/rpc';

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

      console.log('Received message from app:', message);
      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

const serviceWorkerPort = (sourceId: string): RpcPort => ({
  send: async message => navigator.serviceWorker.controller!.postMessage({
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
const activeProxies = new Map<string, (msg: Uint8Array) => void>();

if ('serviceWorker' in navigator) {
  console.log('Initializing singleton...');
  void (async () => {
    // TODO(wittjosiah): Ensure two instances starting up simultaneously results in a single host instance.
    console.log(1);
    await navigator.serviceWorker.register('./service-worker.js');
    console.log(2);
    await navigator.serviceWorker.ready;
    console.log(3);

    const messageChannel = new MessageChannel();
    console.log(4, navigator.serviceWorker.controller);
    navigator.serviceWorker.controller!.postMessage({ type: SingletonMessage.INITIALIZE_CHANNEL }, [
      messageChannel.port2
    ]);
    console.log(5);

    messageChannel.port1.onmessage = async event => {
      const message = event.data;
      console.log('main', { message });
      switch (message?.type) {
        case SingletonMessage.SETUP_CLIENT: {
          const config = new Config(await Dynamics(), Defaults());
          client = new Client(config, { rpcPort: windowPort() });
          await client.initialize();
          navigator.serviceWorker.controller!.postMessage({ type: SingletonMessage.CLIENT_READY });
          window.parent.postMessage({ type: SingletonMessage.CLIENT_READY }, '*');
          break;
        }

        case SingletonMessage.SETUP_PORT: {
          const server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: serviceWorkerPort(message.sourceId)
          });
          navigator.serviceWorker.controller!.postMessage({
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

            console.log('Received message from app:', message);
            navigator.serviceWorker.controller!.postMessage(message);
          });
          window.parent.postMessage({ type: SingletonMessage.CLIENT_READY }, '*');
          break;
        }

        case SingletonMessage.APP_MESSAGE: {
          activeProxies.get(message.sourceId!)?.(new Uint8Array(message.data));
          break;
        }

        case SingletonMessage.CLIENT_MESSAGE: {
          window.parent.postMessage(message);
          break;
        }
      }
    };
  })();
} else {
  console.error('DXOS Client singleton requires access to service workers');
}
