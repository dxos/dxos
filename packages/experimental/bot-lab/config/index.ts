//
// Copyright 2023 DXOS.org
//

import { Config } from '@dxos/client';

// TODO(burdon): Compiles but fails build.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import defaults from './dx-defaults.yml';

const defaults = {
  runtime: {
    client: {
      storage: {
        persistent: true,
        path: './dxos_client_storage',
      },
    },
    services: {
      signaling: [
        {
          server: 'wss://kube.dxos.org/.well-known/dx/signal',
        },
        {
          server: 'wss://dev.kube.dxos.org/.well-known/dx/signal',
        },
      ],
      ice: [
        {
          urls: 'stun:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos',
        },
        {
          urls: 'turn:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos',
        },
      ],
    },
  },
};

// TODO(burdon): Allow overrides.
// TODO(burdon): Import settings via ENV.
export const getConfig = () => new Config(defaults);
