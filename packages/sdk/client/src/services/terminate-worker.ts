export const terminateWorker = async (worker: SharedWorker) => {
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
