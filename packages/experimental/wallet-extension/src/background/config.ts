//
// Copyright 2021 DXOS.org
//

import { Config as ConfigProto, Runtime } from '@dxos/protocols/proto/dxos/config';

export const config: ConfigProto = {
  runtime: {
    client: {
      storage: {
        persistent: true,
        storageType: Runtime.Client.Storage.StorageDriver.IDB,
        path: '/tmp/dxos'
      }
    },
    services: {
      dxns: {
        server: 'wss://node1.devnet.dxos.network/dxns/ws'
      },
      signal: {
        server: 'wss://kube.dxos.org/.well-known/dx/signal',
        api: 'https://kube.dxos.org/dxos/signal/api'
      },
      ice: [
        { urls: 'stun:enterprise.kube.dxos.network:3478' },
        {
          urls: 'turn:enterprise.kube.dxos.network:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        { urls: 'stun:discovery.kube.dxos.network:3478' },
        {
          urls: 'turn:discovery.kube.dxos.network:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};
