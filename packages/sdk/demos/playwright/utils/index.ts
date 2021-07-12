//
// Copyright 2020 DXOS.org
//

import { ClientConfig } from '@dxos/client';

export * from './Browser'

export const ONLINE_CONFIG: ClientConfig = {
  swarm: {
    signal: ['wss://apollo3.kube.moon.dxos.network/dxos/signal']
  }
};
