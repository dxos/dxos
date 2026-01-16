// Entrypoint for dedicated worker.

import { log } from '@dxos/log';
import type { DedicatedWorkerInitMessage } from './types';
import { STORAGE_LOCK_KEY } from '../../lock-key';
import { WorkerRuntime } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createWorkerPort } from '@dxos/rpc-tunnel';
import { Worker } from '@dxos/isomorphic-worker';

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
      Worker.close();
    },
    automaticallyConnectWebrtc: false,
  });
  await runtime.start();

  const session = await runtime.createSession({
    systemPort: createWorkerPort({ port: systemChannel.port2 }),
    appPort: createWorkerPort({ port: appChannel.port2 }),
  });
  runtime.connectWebrtcBridge(session);

  Worker.postMessage(
    {
      type: 'init',
      appPort: appChannel.port1,
      systemPort: systemChannel.port1,
      livenessLockKey: runtime.livenessLockKey,
    } satisfies DedicatedWorkerInitMessage,
    [appChannel.port1, systemChannel.port1],
  );
});
