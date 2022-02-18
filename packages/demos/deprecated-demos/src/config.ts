//
// Copyright 2021 DXOS.org
//

import { ConfigObject } from '@dxos/config';

// TODO(burdon): Read from YML file.
export const ONLINE_CONFIG: ConfigObject = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
      }
    }
  }
};
