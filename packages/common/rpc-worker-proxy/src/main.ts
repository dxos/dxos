//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { sleep } from '@dxos/async';
import { SingletonMessage } from '@dxos/protocols/proto/dxos/rpc/proxy';
import { RpcPeer, RpcPort } from '@dxos/rpc';
import { MaybePromise } from '@dxos/util';

import { ProxyPort } from './proxy-port';

const log = debug('dxos:rpc-worker-proxy');

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
    type: SingletonMessage.Type.PROVIDER_MESSAGE,
    providerMessage: {
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

/**
 * Opens a port to the shared worker and begins listening for messages.
 */
export const openPort = async ({ worker, onSetupProvider, onSetupProxy }: {
  worker: SharedWorker
  onSetupProvider: (port: RpcPort) => MaybePromise<RpcPeer>
  onSetupProxy: (port: RpcPort) => MaybePromise<RpcPeer>
}) => {
  let windowClientProxyHandler: ((event: MessageEvent<SingletonMessage>) => void) | null = null;

  worker.port.start();
  const port = new ProxyPort(worker.port);

  // TODO(wittjosiah): Don't rely on beforeunload, use heartbeat.
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

      case SingletonMessage.Type.SETUP_PROVIDER: {
        if (windowClientProxyHandler) {
          window.removeEventListener('message', windowClientProxyHandler);
          windowClientProxyHandler = null;
        }
        const server = await onSetupProvider(createWindowPort());
        port.postMessage({ type: SingletonMessage.Type.PROVIDER_READY });
        window.parent.postMessage({ type: SingletonMessage.Type.PROVIDER_READY }, '*');
        await server.open();
        break;
      }

      case SingletonMessage.Type.SETUP_PROXY: {
        const { sourceId } = message.setupProxy!;
        const server = await onSetupProxy(createServiceWorkerPort(port, sourceId));
        port.postMessage({
          type: SingletonMessage.Type.PROXY_READY,
          proxyReady: {
            sourceId
          }
        });
        await server.open();
        break;
      }

      case SingletonMessage.Type.PROXY_READY: {
        const { sourceId } = message.proxyReady!;
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
        window.parent.postMessage({ type: SingletonMessage.Type.PROVIDER_READY }, '*');
        break;
      }

      case SingletonMessage.Type.PROXY_MESSAGE: {
        const { sourceId, data } = message.proxyMessage!;
        activeProxies.get(sourceId)?.(new Uint8Array(data));
        break;
      }

      case SingletonMessage.Type.PROVIDER_MESSAGE: {
        const { data } = message.providerMessage!;
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
};
