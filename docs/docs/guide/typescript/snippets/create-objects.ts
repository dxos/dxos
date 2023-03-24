//
// Copyright 2022 DXOS.org
//

import { Client, Expando } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();

  const space = client.spaces.get()[0];

  const object = new Expando({ type: 'task', title: 'buy milk' });

  await space.db.add(object);
})();
