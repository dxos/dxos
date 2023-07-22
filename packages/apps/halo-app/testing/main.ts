//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { Client, fromIFrame } from '@dxos/react-client';

void (async () => {
  const client = new Client({ services: fromIFrame() });
  await client.initialize();

  if (!client.halo.identity) {
    await client.halo.createIdentity();
  }

  log('client', client.toJSON());

  await client.destroy();
})();
