//
// Copyright 2021 DXOS.org
//

import { ConfigObject, defs } from '@dxos/config';

export const config: ConfigObject = {
  runtime: {
    client: {
      storage: {
        persistent: true,
        storageType: defs.Runtime.Client.Storage.StorageDriver.IDB,
        path: '/tmp/dxos'
      }
    },
    services: {
      // dxns: {
      //   server: 'ws://127.0.0.1:9945',
      //   polkadotAddress: '',
      //   dxnsAccount: ''
      // },
      signal: {
        server: 'wss://enterprise.kube.dxos.network/dxos/signal',
        api: 'https://enterprise.kube.dxos.network/dxos/signal/api'
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
