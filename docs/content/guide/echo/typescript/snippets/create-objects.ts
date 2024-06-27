//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = client.spaces.get()[0];

  const object = create(Expando, { type: 'task', name: 'buy milk' });

  await space.db.add(object);
})();
