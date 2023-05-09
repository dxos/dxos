//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { fromHost } from '@dxos/client-services';

const main = async () => {
  const client = new Client({
    // config: new Config({ runtime: { client: { remoteSource: 'http://localhost:3967/vault.html' } } })
    services: fromHost()
  });
  await client.initialize();
  console.log(client.toJSON());
};

void main();
