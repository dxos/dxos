//
// Copyright 2022 DXOS.org
//

import { ConfigProto } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';

export const DEFAULT_CLIENT_ORIGIN = 'https://halo.dxos.org/headless.html';

export const EXPECTED_CONFIG_VERSION = 1;

export const defaultConfig: ConfigProto = { version: 1 };

export const defaultTestingConfig: ConfigProto = {
  version: 1,
  runtime: {
    client: {
      mode: Runtime.Client.Mode.LOCAL
    },
    services: {
      signal: {
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
};
