//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { SingletonMessage } from '../packlets/proto';
import { ProxyPort } from './proxy-port';

const log = debug('dxos:client:shared-worker');
const error = log.extend('error');

let nextId = 1;
const communicationPorts = new Map<number, ProxyPort>();
let clientId: number | null = null;

const getClientPort = () => {
  const port = communicationPorts.get(clientId!);
  if (!port) {
    throw new Error('clientId defined and port not found');
  }

  return port;
};

onconnect = event => {
  const sourceId = nextId;
  nextId++;

  const handlePortMessage = async (event: MessageEvent<SingletonMessage>) => {
    const message = event.data;
    log(`Recieved message from source ${sourceId}`, message);

    // TODO(wittjosiah): Port cleanup.
    // TODO(wittjosiah): Client host transfer.
    switch (message?.type) {
      case SingletonMessage.Type.RECONNECT: {
        const { attempt } = message.reconnect!;
        if (attempt >= 5) {
          error(`Failed to connect to client for source ${sourceId}`);
          break;
        }

        if (!clientId) {
          port.postMessage({
            type: SingletonMessage.Type.RECONNECT,
            reconnect: {
              attempt: attempt + 1
            }
          });
          break;
        }

        getClientPort().postMessage({
          type: SingletonMessage.Type.SETUP_PORT,
          setupPort: {
            sourceId
          }
        });
        break;
      }

      case SingletonMessage.Type.CLIENT_READY: {
        clientId = sourceId;
        [...communicationPorts.keys()].forEach(id => {
          if (id !== sourceId) {
            getClientPort().postMessage({
              type: SingletonMessage.Type.SETUP_PORT,
              setupPort: {
                sourceId: id
              }
            });
          }
        });
        break;
      }

      case SingletonMessage.Type.PORT_READY: {
        const { sourceId } = message.portReady!;
        const forwardPort = communicationPorts.get(sourceId);
        forwardPort?.postMessage(message);
        break;
      }

      case SingletonMessage.Type.PORT_CLOSING: {
        communicationPorts.delete(sourceId);

        if (sourceId === clientId) {
          clientId = null;
          const [port] = [...communicationPorts.values()];
          port?.postMessage({ type: SingletonMessage.Type.SETUP_CLIENT });
        }

        break;
      }

      case SingletonMessage.Type.PROXY_MESSAGE: {
        if (!clientId) {
          port.postMessage({
            type: SingletonMessage.Type.RESEND,
            resend: {
              message
            }
          });
          break;
        }

        const clientPort = communicationPorts.get(clientId);
        clientPort?.postMessage({
          type: SingletonMessage.Type.PROXY_MESSAGE,
          proxyMessage: {
            sourceId,
            data: message.proxyMessage!.data
          }
        });
        break;
      }

      case SingletonMessage.Type.CLIENT_MESSAGE: {
        const { sourceId } = message.clientMessage!;
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
    port.postMessage({ type: SingletonMessage.Type.SETUP_CLIENT });
  } else if (!clientId) {
    port.postMessage({
      type: SingletonMessage.Type.RECONNECT,
      reconnect: {
        attempt: 1
      }
    });
  } else {
    getClientPort().postMessage({
      type: SingletonMessage.Type.SETUP_PORT,
      setupPort: {
        sourceId
      }
    });
  }
};
