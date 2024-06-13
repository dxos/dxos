//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { Task, types } from './schema';

const client = new Client();

void (async () => {
  await client.initialize();
  client.addTypes(types);
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = client.spaces.get()[0];

  const object = new Task({ title: 'buy milk' });

  space.db.add(object);
})();
