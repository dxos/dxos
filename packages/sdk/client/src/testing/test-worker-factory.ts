//
// Copyright 2026 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';
import { runWorker } from '@dxos/worker-framework/worker';

import { STORAGE_LOCK_KEY } from '../lock-key';

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
    // runWorker listens via addEventListener, which (unlike assigning onmessage) does not implicitly
    // start the port, so dispatch it explicitly rather than relying on the host's auto-start.
    messageChannel.port1.start();

    runWorker({
      endpoint: {
        postMessage: (message, transfer) =>
          messageChannel.port1.postMessage(message, transfer ? { transfer } : undefined),
        addEventListener: (type, listener) => messageChannel.port1.addEventListener(type, listener as EventListener),
        removeEventListener: (type, listener) =>
          messageChannel.port1.removeEventListener(type, listener as EventListener),
        close: () => messageChannel.port1.close(),
      },
      storageLockKey: STORAGE_LOCK_KEY,
      createRuntime: async ({ config: configValues, requestShutdown }) => {
        const runtime = new WorkerRuntime({
          configProvider: async () => this._config ?? new Config(configValues ?? {}),
          onStop: async () => {
            messageChannel.port1.close();
            requestShutdown();
          },
          acquireLock: async () => {},
          releaseLock: () => {},
          automaticallyConnectWebrtc: false,
          // Liveness and displacement are owned by worker-framework's runWorker.
          manageLifecycle: false,
          sqliteLayer: sqliteLayerMemory,
        });
        await runtime.start();
        this._ctx.onDispose(() => runtime.stop());

        return {
          stop: async () => runtime.stop(),
          createSession: async ({ appPort, systemPort, clientId, isOwner }) => {
            const session = await runtime.createSession({
              systemPort,
              appPort,
            });
            if (isOwner) {
              runtime.connectWebrtcBridge(session);
            }
          },
        };
      },
    });

    return messageChannel.port2;
  }
}
