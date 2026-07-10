//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import type { WorkerCoordinatorMessage } from '../internal/messages';

const ports = new Set<MessagePort>();

// We need to transfer ports to the correct client since they cannot be cloned.
const portsByClient = new Map<string, MessagePort>();

/**
 * Returns the onconnect handler for the coordinator SharedWorker. Exported so apps can use
 * a custom coordinator entrypoint (e.g. to initialize observability) then attach this handler.
 */
export const createCoordinatorOnConnect = (): ((ev: MessageEvent) => void) => {
  return (ev: MessageEvent) => {
    const port = ev.ports[0];
    ports.add(port);

    port.onmessage = (event: MessageEvent<WorkerCoordinatorMessage>) => {
      switch (event.data.type) {
        case 'request-port': {
          portsByClient.set(event.data.clientId, port);
          break;
        }
        case 'provide-port': {
          const clientPort = portsByClient.get(event.data.clientId);
          if (clientPort) {
            clientPort.postMessage(event.data, {
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
          log.catch(err);
          ports.delete(p);
        }
      }
    };

    port.start();
  };
};

/**
 * Installs the coordinator handler on `globalThis.onconnect` for a SharedWorker entrypoint.
 */
export const runCoordinator = (): void => {
  globalThis.onconnect = createCoordinatorOnConnect();
};
