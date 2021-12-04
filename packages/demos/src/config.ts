//
// Copyright 2021 DXOS.org
//

import { ConfigObject } from '@dxos/config';

// TODO(burdon): Read from YML file.
export const ONLINE_CONFIG: ConfigObject = {
  services: {
    signal: {
      server: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
    }
  }
};
