//
// Copyright 2022 DXOS.org
//

import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      services: {
        signal: {
          server: 'wss://kube.dxos.org/.well-known/dx/signal'
        }
      }
    }
  })
});
