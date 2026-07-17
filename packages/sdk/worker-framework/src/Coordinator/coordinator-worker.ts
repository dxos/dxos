//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import * as WorkerProtocol from '../WorkerProtocol';

/**
 * Returns the onconnect handler for the coordinator SharedWorker. Exported so apps can use
 * a custom coordinator entrypoint (e.g. to initialize observability) then attach this handler.
 *
 * Routing state (connected ports and the per-client reverse map) lives in the returned closure
 * rather than in module globals so a single coordinator instance owns exactly one routing table —
 * this keeps the state testable in isolation and avoids accidental cross-instance sharing.
 */
export const createOnConnect = (): ((ev: MessageEvent) => void) => {
  // All tab ports connected to this coordinator. Broadcast targets for leadership/heartbeat traffic.
  const ports = new Set<MessagePort>();
  // Reverse map from clientId to the tab port that requested a session, so directed `provide-port`
  // replies (which carry non-cloneable MessagePorts) reach only the requesting tab.
  const portsByClient = new Map<string, MessagePort>();
  // Distinguishes coordinator instances in logs. A second tab connecting to a *shared* coordinator
  // must log the same instanceId with a growing port count; a fresh instanceId (or a port count that
  // resets to 1) means the SharedWorker was not shared across the tabs.
  const instanceId = `coordinator-${crypto.randomUUID().slice(0, 8)}`;
  log('coordinator: created', { instanceId });

  return (ev: MessageEvent) => {
    const port = ev.ports[0];
    ports.add(port);
    log('coordinator: tab connected', { instanceId, ports: ports.size });

    port.onmessage = (event: MessageEvent<WorkerProtocol.CoordinatorMessage>) => {
      const message = event.data;
      switch (message.type) {
        case 'request-port': {
          portsByClient.set(message.clientId, port);
          log('coordinator: request-port', {
            instanceId,
            clientId: message.clientId,
            ports: ports.size,
            clients: portsByClient.size,
          });
          break;
        }
        case 'provide-port': {
          const clientPort = portsByClient.get(message.clientId);
          if (clientPort) {
            log('coordinator: routing provide-port', {
              instanceId,
              clientId: message.clientId,
              leaderId: message.leaderId,
            });
            clientPort.postMessage(message, {
              transfer: [message.clientToWorker, message.workerToClient],
            });
          } else {
            log.error('coordinator: no port for client', {
              instanceId,
              clientId: message.clientId,
              knownClients: [...portsByClient.keys()],
            });
          }
          return;
        }
      }

      // Broadcast leadership/heartbeat/request traffic to every connected tab (including the sender,
      // which receivers filter by id). `provide-port` returned above — it is directed, not broadcast.
      let delivered = 0;
      for (const peer of ports) {
        try {
          peer.postMessage(message);
          delivered++;
        } catch (err) {
          log.catch(err);
          ports.delete(peer);
        }
      }
      log('coordinator: broadcast', { instanceId, type: message.type, delivered, ports: ports.size });
    };

    port.start();
  };
};

/**
 * Installs the coordinator handler on `globalThis.onconnect` for a SharedWorker entrypoint.
 */
export const run = (): void => {
  globalThis.onconnect = createOnConnect();
};
