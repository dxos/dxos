//
// Copyright 2021 DXOS.org
//

import { ConfigProto } from '@dxos/config';

// TODO(burdon): Read from YML file.
export const ONLINE_CONFIG: ConfigProto = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'wss://demo.kube.dxos.network/dxos/signal'
      },
      ice: [
        {
          urls: 'turn:demo.kube.moon.dxos.network:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};
