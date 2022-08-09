//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { sleep } from '@dxos/async';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { createBundledRpcServer, RpcPort } from '@dxos/rpc';

import { Client } from '../client';
import { clientServiceBundle } from '../packlets/api';
import { SingletonMessage } from '../packlets/proxy';

const log = debug('dxos:client:singleton');
debug.enable('dxos:client:singleton');

const RECONNECT_BACKOFF = 500;
const activeProxies = new Map<string, (msg: Uint8Array) => void>();
let client: Client;

/**
 * Creates RpcPort for communicating with parent window.
 */
const createWindowPort = (): RpcPort => ({
  send: async message => window.parent.postMessage({
    data: Array.from(message),
    type: SingletonMessage.CLIENT_MESSAGE
  }, '*'),
  subscribe: callback => {
    const handler = (event: MessageEvent<any>) => {
      const message = event.data;
      if (message?.type !== SingletonMessage.APP_MESSAGE) {
        return;
      }

      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

/**
 * Creates RpcPort for communicating with other windows via SharedWorker.
 */
const createServiceWorkerPort = (sendPort: MessagePort, sourceId: string): RpcPort => ({
  send: async message => sendPort.postMessage({
    type: SingletonMessage.CLIENT_MESSAGE,
    sourceId,
    data: Array.from(message)
  }),
  subscribe: callback => {
    // Maintain set of proxies and reuse main port message event handler.
    activeProxies.set(sourceId, callback);
    return () => activeProxies.delete(sourceId);
  }
});

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker('./shared-worker.js');
    worker.port.start();

    const windowClientProxyHandler = (event: MessageEvent<any>) => {
      const message = event.data;
      if (message?.type !== SingletonMessage.APP_MESSAGE) {
        return;
      }

      worker.port.postMessage(message);
    };

    window.addEventListener('beforeunload', () => {
      worker.port.postMessage({ type: SingletonMessage.PORT_CLOSING });
    });

    worker.port.addEventListener('message', async event => {
      const message = event.data;
      log('Recieved message from shared worker', message);
      switch (message?.type) {
        case SingletonMessage.RECONNECT: {
          await sleep(message.attempt * RECONNECT_BACKOFF);
          worker.port.postMessage(message);
          break;
        }

        case SingletonMessage.SETUP_CLIENT: {
          const config = new Config(await Dynamics(), Defaults());
          client = new Client(config);
          await client.initialize();

          // If proxy previously exists remove it.
          window.removeEventListener('message', windowClientProxyHandler);
          const server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: createWindowPort()
          });

          worker.port.postMessage({ type: SingletonMessage.CLIENT_READY });
          window.parent.postMessage({ type: SingletonMessage.CLIENT_READY }, '*');
          await server.open();
          break;
        }

        case SingletonMessage.SETUP_PORT: {
          const server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: createServiceWorkerPort(worker.port, message.sourceId)
          });
          worker.port.postMessage({
            type: SingletonMessage.PORT_READY,
            sourceId: message.sourceId
          });
          await server.open();
          break;
        }

        case SingletonMessage.PORT_READY: {
          window.addEventListener('message', windowClientProxyHandler);
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

        case SingletonMessage.RESEND: {
          worker.port.postMessage(message);
          break;
        }
      }
    });
  })();
} else {
  throw new Error('DXOS Client singleton requires a browser with support for shared workers.');
}
