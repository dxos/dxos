import { describe, test } from 'vitest';
import { DedicatedWorkerClientServices } from './dedicated-worker-client-services';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';
import type { DedicatedWorkerInitMessage } from './types';
import { STORAGE_LOCK_KEY } from '../../lock-key';
import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createWorkerPort } from '@dxos/rpc-tunnel';

/**
 * In-thread worker for testing purposes.
 */
class TestWorkerFactory extends Resource {
  make(): MessagePort {
    const messageChannel = new MessageChannel();
    // Entrypoint for dedicated worker.

    log('worker-entrypoint');

    // Lock ensures only a single worker is running.
    void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
      const appChannel = new MessageChannel();
      const systemChannel = new MessageChannel();

      const runtime = new WorkerRuntime({
        configProvider: async () => {
          return new Config(); // TODO(dmaretsky): Take using an rpc message from spawning process.
        },
        // TODO(dmaretskyi): We should split the storage lock and liveness. Keep storage lock fully inside WorkerRuntime, while liveness stays outside.
        acquireLock: async () => {},
        releaseLock: () => {},
        onStop: async () => {
          // Close the shared worker, lock will be released automatically.
          messageChannel.port1.close();
        },
        automaticallyConnectWebrtc: false,
      });
      await runtime.start();
      this._ctx.onDispose(() => runtime.stop());

      messageChannel.port1.postMessage(
        {
          type: 'init',
          appPort: appChannel.port1,
          systemPort: systemChannel.port1,
          livenessLockKey: runtime.livenessLockKey,
        } satisfies DedicatedWorkerInitMessage,
        [appChannel.port1, systemChannel.port1],
      );

      // Will block until the other side finishes the handshake.
      const session = await runtime.createSession({
        systemPort: createWorkerPort({ port: systemChannel.port2 }),
        appPort: createWorkerPort({ port: appChannel.port2 }),
      });
      runtime.connectWebrtcBridge(session);
    });

    return messageChannel.port2;
  }
}

describe(
  'DedicatedWorkerClientServices',
  () => {
    test('open & close', async () => {
      await using testWorker = await new TestWorkerFactory().open();
      await using services = await new DedicatedWorkerClientServices(() => testWorker.make()).open();
    });
  },
  { timeout: 1_000, retry: 0 },
);
