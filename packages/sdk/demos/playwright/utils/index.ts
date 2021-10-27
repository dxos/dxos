//
// Copyright 2020 DXOS.org
//

import { ConfigObject } from '@dxos/config';

export * from './Browser';

export const ONLINE_CONFIG: ConfigObject = {
  services: {
    signal: {
      server: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
    }
  }
};
