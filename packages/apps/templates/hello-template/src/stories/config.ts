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
        server: 'wss://kube.dxos.org/.well-known/dx/signal'
      },
      ice: [
        {
          urls: 'turn:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};
