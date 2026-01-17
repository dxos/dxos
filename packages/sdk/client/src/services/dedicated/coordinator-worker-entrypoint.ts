import { log } from '@dxos/log';
import type { WorkerCoordinatorMessage } from './types';

const ports = new Set<MessagePort>();

// We need to transfer ports to the correct client since they cannot be cloned.
const portsByClient = new Map<string, MessagePort>();

globalThis.onconnect = (ev: MessageEvent) => {
  const port = ev.ports[0];
  ports.add(port);

  port.onmessage = (event: MessageEvent<WorkerCoordinatorMessage>) => {
    switch (event.data.type) {
      case 'request-port': {
        portsByClient.set(event.data.clientId, port);
        break;
      }
      case 'provide-port': {
        const port = portsByClient.get(event.data.clientId);
        if (port) {
          port.postMessage(event.data, {
            transfer: [event.data.appPort, event.data.systemPort],
          });
        } else {
          log.error('no port for client', { clientId: event.data.clientId });
        }
        return;
      }
    }
    for (const p of ports) {
      try {
        p.postMessage(event.data);
      } catch (err) {
        ports.delete(p);
      }
    }
  };

  port.start();
};
