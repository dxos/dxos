//
// Copyright 2020 DXOS.org
//

import { ConfigV1Object } from '@dxos/config';

export * from './Browser';

export const ONLINE_CONFIG: ConfigV1Object = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
      }
    }
  }
};
