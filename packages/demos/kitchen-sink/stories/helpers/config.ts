//
// Copyright 2021 DXOS.org
//

import { ConfigObject } from '@dxos/config';

// TODO(burdon): Read from YML file (or default config).
export const ONLINE_CONFIG: ConfigObject = {
  version: 1,
  runtime: {
    services: {
      ipfs: {
        server: 'https://ipfs-pub1.kube.dxos.network'
      },
      signal: {
        server: 'wss://demo.kube.dxos.network/dxos/signal'
      },
      ice: [
        {
          urls: 'turn:demo.kube.dxos.network:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};
