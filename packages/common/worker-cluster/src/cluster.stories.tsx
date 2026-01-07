import React, { useEffect } from 'react';
import { Cluster } from './cluster';

export default {};

const cluster = new Cluster(4);

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
