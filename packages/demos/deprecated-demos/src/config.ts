//
// Copyright 2021 DXOS.org
//

import { ConfigV1Object } from '@dxos/config';

// TODO(burdon): Read from YML file.
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
