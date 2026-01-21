// Entrypoint for dedicated worker.

//
// Copyright 2026 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { STORAGE_LOCK_KEY } from '../../lock-key';

import type { DedicatedWorkerMessage } from './types';

const workerId = crypto.randomUUID().slice(0, 8);
log.info('worker-entrypoint starting', { workerId });

// Lock ensures only a single worker is running.
void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
  log.info('worker-entrypoint: lock acquired', { workerId });

  let runtime: WorkerRuntime;
  let owningClientId: string;
  const tabsProcessed = new Set<string>();

  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const handleMessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
    const message = ev.data;
    log.info('worker got message', { type: message.type });
    switch (message.type) {
      case 'init': {
        log.info('worker received init', { workerId, clientId: message.clientId });
        owningClientId = message.clientId;
        runtime = new WorkerRuntime({
          configProvider: async () => {
            return new Config({}); // TODO(dmaretsky): Take using an rpc message from spawning process.
          },
          onStop: async () => {
            log.info('worker runtime stopping', { workerId });
            // Close the shared worker, lock will be released automatically.
            self.close();
            releaseLock();
          },
          // TODO(dmaretskyi): We should split the storage lock and liveness. Keep storage lock fully inside WorkerRuntime, while liveness stays outside.
          acquireLock: async () => {},
          releaseLock: () => {},
          automaticallyConnectWebrtc: false,
          enableFullTextIndexing: true,
        });
        log.info('worker runtime starting', { workerId });
        await runtime.start();
        log.info('worker runtime started', { workerId, livenessLockKey: runtime.livenessLockKey });
        self.postMessage({
          type: 'ready',
          livenessLockKey: runtime.livenessLockKey,
        } satisfies DedicatedWorkerMessage);
        break;
      }
      case 'start-session': {
        log.info('worker start-session', { workerId, clientId: message.clientId, tabsProcessed: Array.from(tabsProcessed) });
        if (tabsProcessed.has(message.clientId)) {
          log.info('ignoring duplicate client', { workerId, clientId: message.clientId });
          break;
        }
        tabsProcessed.add(message.clientId);

        const appChannel = new MessageChannel();
        const systemChannel = new MessageChannel();

        self.postMessage(
          {
            type: 'session',
            appPort: appChannel.port1,
            systemPort: systemChannel.port1,
            clientId: message.clientId,
          } satisfies DedicatedWorkerMessage,
          [appChannel.port1, systemChannel.port1],
        );

        // Will block until the other side finishes the handshake.
        {
          log.info('worker creating session', { workerId, clientId: message.clientId });
          const session = await runtime.createSession({
            systemPort: createWorkerPort({ port: systemChannel.port2 }),
            appPort: createWorkerPort({ port: appChannel.port2 }),
          });
          log.info('worker session created', { workerId, clientId: message.clientId, isOwner: message.clientId === owningClientId });
          if (message.clientId === owningClientId) {
            runtime.connectWebrtcBridge(session);
          }
        }
        break;
      }

      default:
        log.error('unknown message', { type: (message as any).type });
    }
  };

  self.addEventListener('message', handleMessage);
  self.postMessage({
    type: 'listening',
  } satisfies DedicatedWorkerMessage);

  await lockPromise;
  self.removeEventListener('message', handleMessage);
});
