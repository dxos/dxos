import { Trigger } from '@dxos/async';

export const createWorker = () =>
  new SharedWorker(new URL('@dxos/client/shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

export const killWorker = async () => {
  const worker = createWorker();

  const terminated = new Promise<void>((resolve) => {
    worker.port.onmessage = (event) => {
      // See: packages/sdk/client/src/worker/onconnect.ts
      if (event.data.command === 'bequest') {
        navigator.locks.request(event.data.lockName, (lock) => {
          resolve();
        });
      }
    };
  });

  // See: packages/sdk/client/src/worker/onconnect.ts
  worker.port.postMessage({ command: 'close' });

  await terminated;
};
