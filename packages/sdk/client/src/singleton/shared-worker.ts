//
// Copyright 2020 DXOS.org
//

import { SingletonMessage } from '../packlets/proxy';

let nextId = 0;
const communicationPorts = new Map<number, MessagePort>();
let clientId: number;

const initializePort = (sourceId: number) => {
  const clientPort = communicationPorts.get(clientId);
  if (!clientPort) {
    return;
  }

  clientPort.postMessage({ type: SingletonMessage.SETUP_PORT, sourceId });
};

// TODO(wittjosiah): Figure out shared worker typing.
// eslint-disable-next-line
// @ts-ignore
onconnect = event => {
  const sourceId = nextId;
  const port = event.ports[0];
  communicationPorts.set(sourceId, port);
  nextId++;

  port.onmessage = async (event: MessageEvent) => {
    const message = event.data;

    // TODO(wittjosiah): Port cleanup.
    // TODO(wittjosiah): Client host transfer.
    switch (message?.type) {
      case SingletonMessage.CLIENT_READY: {
        clientId = sourceId;
        [...communicationPorts.keys()].forEach(id => {
          if (id !== sourceId) {
            initializePort(id);
          }
        });
        break;
      }

      case SingletonMessage.PORT_READY: {
        const forwardPort = communicationPorts.get(message.sourceId);
        forwardPort?.postMessage({ type: SingletonMessage.PORT_READY });
        break;
      }

      case SingletonMessage.APP_MESSAGE: {
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

  if (communicationPorts.size > 1) {
    initializePort(sourceId);
  } else {
    port.postMessage({ type: SingletonMessage.SETUP_CLIENT });
  }
};
