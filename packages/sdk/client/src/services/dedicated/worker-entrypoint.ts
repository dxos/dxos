// Entrypoint for dedicated worker.

import { log } from '@dxos/log';
import type { DedicatedWorkerMessage } from './types';
import { STORAGE_LOCK_KEY } from '../../lock-key';
import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createWorkerPort } from '@dxos/rpc-tunnel';

log.info('worker-entrypoint 123');

// Lock ensures only a single worker is running.
void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
  log.info('worker-entrypoint: lock acquired');

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
        owningClientId = message.clientId;
        runtime = new WorkerRuntime({
          configProvider: async () => {
            return new Config({}); // TODO(dmaretsky): Take using an rpc message from spawning process.
          },
          onStop: async () => {
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
        await runtime.start();
        self.postMessage({
          type: 'ready',
          livenessLockKey: runtime.livenessLockKey,
        } satisfies DedicatedWorkerMessage);
        break;
      }
      case 'start-session': {
        if (tabsProcessed.has(message.clientId)) {
          log.info('ignoring duplicate client');
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
          const session = await runtime.createSession({
            systemPort: createWorkerPort({ port: systemChannel.port2 }),
            appPort: createWorkerPort({ port: appChannel.port2 }),
          });
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
