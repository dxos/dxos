//
// Copyright 2024 DXOS.org
//

import * as localForage from 'localforage';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Config } from '@dxos/config';

const Root = () => {
  const config = new Config({
    version: 1,
    runtime: {
      client: {
        storage: {
          persistent: true,
        },
        edgeFeatures: {
          signaling: true,
          echoReplicator: true,
          feedReplicator: true,
          agents: true,
        },
      },
      services: {
        edge: {
          url: 'wss://edge-production.dxos.workers.dev/',
        },
        iceProviders: [
          {
            urls: 'https://edge-production.dxos.workers.dev/ice',
          },
        ],
        ipfs: {
          server: 'https://api.ipfs.dxos.network/api/v0',
          gateway: 'https://gateway.ipfs.dxos.network/ipfs',
        },
      },
    },
  });
  console.log('config', config);

  return (
    <div>
      <button onClick={() => localForage.setItem('test_key', 123)}>
        <span>write</span>
      </button>
      <button onClick={() => localForage.getItem('test_key').then((data) => console.log('data', data))}>
        <span>read</span>
      </button>
    </div>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
