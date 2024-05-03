//
// Copyright 2022 DXOS.org
//

import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      client: {
        remoteSource: 'http://halo.localhost/vault.html'
      }
    }
  })
});
