import React, { useEffect } from 'react';
import { Cluster } from '../cluster';

export default {};

const cluster = new Cluster({
  poolSize: 2,
  createWorker: (instanceId, name) => {
    const url = new URL('./worker-main?worker', import.meta.url);
    // Setting the instanceId in url constructor is a vite compilation error.
    url.searchParams.set('instanceId', instanceId.toString());
    return new SharedWorker(url, { name, type: 'module' });
  },
  names: ['main', 'indexing'],
});

export const Default = () => {
  useEffect(
    () =>
      queueMicrotask(async () => {
        await cluster.open();
      }),
    [],
  );
  return <h1>Hello cluster</h1>;
};
