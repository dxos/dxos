//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { SingletonMessage } from '../packlets/proxy';

const log = debug('dxos:client:shared-worker');
const error = log.extend('error');
debug.enable('dxos:client:shared-worker');

let nextId = 1;
const communicationPorts = new Map<number, MessagePort>();
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

  const handlePortMessage = async (event: MessageEvent<any>) => {
    const message = event.data;
    log(`Recieved message from source ${sourceId}`, message);

    // TODO(wittjosiah): Port cleanup.
    // TODO(wittjosiah): Client host transfer.
    switch (message?.type) {
      case SingletonMessage.RECONNECT: {
        if (message.attempt >= 5) {
          error(`Failed to connect to client for source ${sourceId}`);
          break;
        }

        if (!clientId) {
          port.postMessage({ type: SingletonMessage.RECONNECT, attempt: message.attempt + 1 });
          break;
        }

        getClientPort().postMessage({ type: SingletonMessage.SETUP_PORT, sourceId });
        break;
      }

      case SingletonMessage.CLIENT_READY: {
        clientId = sourceId;
        [...communicationPorts.keys()].forEach(id => {
          if (id !== sourceId) {
            getClientPort().postMessage({ type: SingletonMessage.SETUP_PORT, sourceId: id });
          }
        });
        break;
      }

      case SingletonMessage.PORT_READY: {
        const forwardPort = communicationPorts.get(message.sourceId);
        forwardPort?.postMessage({ type: SingletonMessage.PORT_READY });
        break;
      }

      case SingletonMessage.PORT_CLOSING: {
        communicationPorts.delete(sourceId);

        if (sourceId === clientId) {
          clientId = null;
          const [port] = [...communicationPorts.values()];
          port?.postMessage({ type: SingletonMessage.SETUP_CLIENT });
        }

        break;
      }

      case SingletonMessage.APP_MESSAGE: {
        if (!clientId) {
          port.postMessage({ type: SingletonMessage.RESEND, message });
          break;
        }

        const clientPort = communicationPorts.get(clientId);
        clientPort?.postMessage({ ...message, sourceId });
        break;
      }

      case SingletonMessage.CLIENT_MESSAGE: {
        const forwardPort = communicationPorts.get(message.sourceId);
        forwardPort?.postMessage(message);
        break;
      }
    }
  };

  const port = event.ports[0];
  port.onmessage = handlePortMessage;
  communicationPorts.set(sourceId, port);

  if (communicationPorts.size === 1) {
    port.postMessage({ type: SingletonMessage.SETUP_CLIENT });
  } else if (!clientId) {
    port.postMessage({ type: SingletonMessage.RECONNECT, attempt: 1 });
  } else {
    getClientPort().postMessage({ type: SingletonMessage.SETUP_PORT, sourceId });
  }
};
