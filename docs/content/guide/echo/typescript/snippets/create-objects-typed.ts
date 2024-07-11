//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { create } from '@dxos/echo-schema';

import { TaskType } from './schema';

const client = new Client();

void (async () => {
  await client.initialize();
  client.addTypes([TaskType]);
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = client.spaces.get()[0];

  const object = create(TaskType, { name: 'buy milk' });

  space.db.add(object);
})();
