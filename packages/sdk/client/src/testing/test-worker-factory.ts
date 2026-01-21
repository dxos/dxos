//
// Copyright 2026 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { STORAGE_LOCK_KEY } from '../lock-key';
import type { DedicatedWorkerMessage } from '../services/dedicated/types';

/**
 * In-thread worker for testing purposes.
 * Creates a WorkerRuntime in the same thread using MessageChannel for communication.
 */
export class TestWorkerFactory extends Resource {
  constructor(private readonly _config?: Config) {
    super();
  }

  /**
   * Creates a new MessagePort connected to the worker runtime.
   */
  make(): MessagePort {
    log('worker-entrypoint');
    const messageChannel = new MessageChannel();

    let runtime: WorkerRuntime;
    /**
     * Client that owns the worker.
     */
    let owningClientId: string;

    const tabsProcessed = new Set<string>();

    // Lock release mechanism - holds the lock until runtime stops.
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Lock ensures only a single worker is running.
    void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
      messageChannel.port1.onmessage = async (ev: MessageEvent<DedicatedWorkerMessage>) => {
        log.info('worker got message', { type: ev.data.type });
        switch (ev.data.type) {
          case 'init': {
            owningClientId = ev.data.clientId;
            runtime = new WorkerRuntime({
              configProvider: async () => {
                return this._config ?? new Config();
              },
              onStop: async () => {
                // Close the port and release the lock.
                messageChannel.port1.close();
                releaseLock();
              },
              // TODO(dmaretskyi): We should split the storage lock and liveness. Keep storage lock fully inside WorkerRuntime, while liveness stays outside.
              acquireLock: async () => {},
              releaseLock: () => {},
              automaticallyConnectWebrtc: false,
            });
            await runtime.start();
            this._ctx.onDispose(() => runtime.stop());
            messageChannel.port1.postMessage({
              type: 'ready',
              livenessLockKey: runtime.livenessLockKey,
            } satisfies DedicatedWorkerMessage);
            break;
          }
          case 'start-session': {
            if (tabsProcessed.has(ev.data.clientId)) {
              log.info('ignoring duplicate client');
              break;
            }
            tabsProcessed.add(ev.data.clientId);

            const appChannel = new MessageChannel();
            const systemChannel = new MessageChannel();

            messageChannel.port1.postMessage(
              {
                type: 'session',
                appPort: appChannel.port1,
                systemPort: systemChannel.port1,
                clientId: ev.data.clientId,
              } satisfies DedicatedWorkerMessage,
              [appChannel.port1, systemChannel.port1],
            );

            // Will block until the other side finishes the handshake.
            {
              const session = await runtime.createSession({
                systemPort: createWorkerPort({ port: systemChannel.port2 }),
                appPort: createWorkerPort({ port: appChannel.port2 }),
              });
              if (ev.data.clientId === owningClientId) {
                runtime.connectWebrtcBridge(session);
              }
            }
            break;
          }

          default:
            log.error('unknown message', { type: ev.data });
        }
      };
      messageChannel.port1.postMessage({ type: 'listening' } satisfies DedicatedWorkerMessage);

      // Hold the lock until the runtime stops.
      await lockPromise;
    });

    return messageChannel.port2;
  }
}
