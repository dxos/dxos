//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { SingletonMessage } from './proto';
import { ProxyPort } from './proxy-port';

const log = debug('dxos:rpc-worker-proxy:shared-worker');
const error = log.extend('error');

const communicationPorts = new Map<number, ProxyPort>();
let nextId = 1;
let providerId: number | null = null;

const getClientPort = () => {
  const port = communicationPorts.get(providerId!);
  if (!port) {
    throw new Error('providerId defined and port not found');
  }

  return port;
};

/**
 * Handles incoming connections from proxies.
 * Intended to be assigned as the onconnect handler of a shared worker.
 */
export const handleConnect = (event: MessageEvent<any>) => {
  const sourceId = nextId++;

  const handlePortMessage = async (event: MessageEvent<SingletonMessage>) => {
    const message = event.data;
    log(`Recieved message from source ${sourceId}`, message);

    switch (message?.type) {
      case SingletonMessage.Type.RECONNECT: {
        const { attempt } = message.reconnect!;
        if (attempt >= 5) {
          error(`Failed to connect to client for source ${sourceId}`);
          break;
        }

        if (!providerId) {
          port.postMessage({
            type: SingletonMessage.Type.RECONNECT,
            reconnect: {
              attempt: attempt + 1
            }
          });
          break;
        }

        getClientPort().postMessage({
          type: SingletonMessage.Type.SETUP_PROXY,
          setupProxy: {
            sourceId
          }
        });
        break;
      }

      case SingletonMessage.Type.PROVIDER_READY: {
        providerId = sourceId;
        [...communicationPorts.keys()].forEach(id => {
          if (id !== sourceId) {
            getClientPort().postMessage({
              type: SingletonMessage.Type.SETUP_PROXY,
              setupProxy: {
                sourceId: id
              }
            });
          }
        });
        break;
      }

      case SingletonMessage.Type.PROXY_READY: {
        const { sourceId } = message.proxyReady!;
        const forwardPort = communicationPorts.get(sourceId);
        forwardPort?.postMessage(message);
        break;
      }

      case SingletonMessage.Type.PORT_CLOSING: {
        communicationPorts.delete(sourceId);

        if (sourceId === providerId) {
          providerId = null;
          const [port] = [...communicationPorts.values()];
          port?.postMessage({ type: SingletonMessage.Type.SETUP_PROVIDER });
        }

        break;
      }

      case SingletonMessage.Type.PROXY_MESSAGE: {
        if (!providerId) {
          port.postMessage({
            type: SingletonMessage.Type.RESEND,
            resend: {
              message
            }
          });
          break;
        }

        const clientPort = communicationPorts.get(providerId);
        clientPort?.postMessage({
          type: SingletonMessage.Type.PROXY_MESSAGE,
          proxyMessage: {
            sourceId,
            data: message.proxyMessage!.data
          }
        });
        break;
      }

      case SingletonMessage.Type.PROVIDER_MESSAGE: {
        const { sourceId } = message.providerMessage!;
        const forwardPort = communicationPorts.get(sourceId);
        forwardPort?.postMessage(message);
        break;
      }
    }
  };

  const port = new ProxyPort(event.ports[0]);
  port.onmessage = handlePortMessage;
  communicationPorts.set(sourceId, port);

  if (communicationPorts.size === 1) {
    port.postMessage({ type: SingletonMessage.Type.SETUP_PROVIDER });
  } else if (!providerId) {
    port.postMessage({
      type: SingletonMessage.Type.RECONNECT,
      reconnect: {
        attempt: 1
      }
    });
  } else {
    getClientPort().postMessage({
      type: SingletonMessage.Type.SETUP_PROXY,
      setupProxy: {
        sourceId
      }
    });
  }
};
