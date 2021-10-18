//
// Copyright 2021 DXOS.org
//

import { ClientConfig } from '@dxos/client';

export const config: ClientConfig = {
  storage: {
    persistent: true,
    type: 'idb',
    path: '/tmp/dxos'
  },
  swarm: {
    signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal',
    ice: [
      { urls: 'stun:apollo3.kube.moon.dxos.network:3478' },
      {
        urls: 'turn:apollo3.kube.moon.dxos.network:3478',
        username: 'dxos',
        credential: 'dxos'
      }
    ]
  }
};
