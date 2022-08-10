//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { sleep } from '@dxos/async';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { createBundledRpcServer, RpcPort } from '@dxos/rpc';

import { Client } from '../client';
import { clientServiceBundle } from '../packlets/api';
import { SingletonMessage } from '../packlets/proto';
import { ProxyPort } from './proxy-port';

const log = debug('dxos:client:singleton');

const RECONNECT_BACKOFF = 500;
const activeProxies = new Map<number, (msg: Uint8Array) => void>();

/**
 * Creates RpcPort for communicating with parent window.
 */
const createWindowPort = (): RpcPort => ({
  send: async message => window.parent.postMessage({
    type: SingletonMessage.Type.WINDOW_MESSAGE,
    data: Array.from(message)
  }, '*'),
  subscribe: callback => {
    const handler = (event: MessageEvent<SingletonMessage>) => {
      const message = event.data;
      if (message?.type !== SingletonMessage.Type.WINDOW_MESSAGE) {
        return;
      }

      callback(new Uint8Array(message.data!));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
});

/**
 * Creates RpcPort for communicating with other windows via SharedWorker.
 */
const createServiceWorkerPort = (sendPort: ProxyPort, sourceId: number): RpcPort => ({
  send: async message => sendPort.postMessage({
    type: SingletonMessage.Type.CLIENT_MESSAGE,
    clientMessage: {
      sourceId,
      data: message
    }
  }),
  subscribe: callback => {
    // Maintain set of proxies and reuse main port message event handler.
    activeProxies.set(sourceId, callback);
    return () => activeProxies.delete(sourceId);
  }
});

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    let client: Client;
    let windowClientProxyHandler: ((event: MessageEvent<SingletonMessage>) => void) | null = null;

    const worker = new SharedWorker('./shared-worker.js');
    worker.port.start();
    const port = new ProxyPort(worker.port);

    window.addEventListener('beforeunload', () => {
      port.postMessage({ type: SingletonMessage.Type.PORT_CLOSING });
    });

    port.onmessage = async event => {
      const message = event.data;
      log('Recieved message from shared worker', message);
      switch (message?.type) {
        case SingletonMessage.Type.RECONNECT: {
          const { attempt } = message.reconnect!;
          await sleep(attempt * RECONNECT_BACKOFF);
          port.postMessage(message);
          break;
        }

        case SingletonMessage.Type.SETUP_CLIENT: {
          const config = new Config(await Dynamics(), Defaults());
          client = new Client(config);
          await client.initialize();

          if (windowClientProxyHandler) {
            window.removeEventListener('message', windowClientProxyHandler);
            windowClientProxyHandler = null;
          }
          const server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: createWindowPort()
          });

          port.postMessage({ type: SingletonMessage.Type.CLIENT_READY });
          window.parent.postMessage({ type: SingletonMessage.Type.CLIENT_READY }, '*');
          await server.open();
          break;
        }

        case SingletonMessage.Type.SETUP_PORT: {
          const { sourceId } = message.setupPort!;
          const server = createBundledRpcServer({
            services: clientServiceBundle,
            handlers: client.services,
            port: createServiceWorkerPort(port, sourceId)
          });
          port.postMessage({
            type: SingletonMessage.Type.PORT_READY,
            portReady: {
              sourceId
            }
          });
          await server.open();
          break;
        }

        case SingletonMessage.Type.PORT_READY: {
          const { sourceId } = message.portReady!;
          windowClientProxyHandler = (event: MessageEvent<SingletonMessage>) => {
            const message = event.data;
            if (message?.type !== SingletonMessage.Type.WINDOW_MESSAGE) {
              return;
            }

            port.postMessage({
              type: SingletonMessage.Type.PROXY_MESSAGE,
              proxyMessage: {
                sourceId,
                data: message.data!
              }
            });
          };

          window.addEventListener('message', windowClientProxyHandler);
          window.parent.postMessage({ type: SingletonMessage.Type.CLIENT_READY }, '*');
          break;
        }

        case SingletonMessage.Type.PROXY_MESSAGE: {
          const { sourceId, data } = message.proxyMessage!;
          activeProxies.get(sourceId)?.(new Uint8Array(data));
          break;
        }

        case SingletonMessage.Type.CLIENT_MESSAGE: {
          const { data } = message.clientMessage!;
          window.parent.postMessage({
            type: SingletonMessage.Type.WINDOW_MESSAGE,
            data
          }, '*');
          break;
        }

        case SingletonMessage.Type.RESEND: {
          port.postMessage(message);
          break;
        }
      }
    };
  })();
} else {
  throw new Error('DXOS Client singleton requires a browser with support for shared workers.');
}
