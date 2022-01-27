//
// Copyright 2021 DXOS.org
//

import { ConfigV1Object, defs } from '@dxos/config';

export const config: ConfigV1Object = {
  runtime: {
    client: {
      storage: {
        persistent: true,
        storageType: defs.System.Storage.StorageDriver.IDB,
        path: '/tmp/dxos'
      }
    },
    services: {
      signal: {
        server: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
      },
      ice: [
        { urls: 'stun:apollo3.kube.moon.dxos.network:3478' },
        {
          urls: 'turn:apollo3.kube.moon.dxos.network:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};
