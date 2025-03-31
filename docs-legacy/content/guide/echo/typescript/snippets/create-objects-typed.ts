//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { create } from '@dxos/live-object';

import { TaskType } from './schema';

const client = new Client({ types: [TaskType] });

void (async () => {
  await client.initialize();
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = client.spaces.get()[0];

  const object = create(TaskType, { name: 'buy milk' });

  space.db.add(object);
})();
