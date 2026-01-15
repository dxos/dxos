// Entrypoint for dedicated worker.

import { log } from '@dxos/log';
import type { DedicatedWorkerInitMessage } from './types';
import { STORAGE_LOCK_KEY } from '../../lock-key';

log('worker-entrypoint');

// Lock ensures only a single worker is running.
void navigator.locks.request(STORAGE_LOCK_KEY, async () => {
  const appChannel = new MessageChannel();
  const systemChannel = new MessageChannel();
  const livenessLockKey = `dxos-dedicated-worker-liveness-lock-${crypto.randomUUID()}`;

  navigator.locks.request(livenessLockKey, async () => {
    await new Promise(() => {}); // Blocks for the duration of the worker's lifetime.
  });

  globalThis.postMessage(
    {
      type: 'init',
      appPort: appChannel.port1,
      systemPort: systemChannel.port1,
      livenessLockKey,
    } satisfies DedicatedWorkerInitMessage,
    [appChannel.port1, systemChannel.port1],
  );

  
});
