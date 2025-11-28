//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Filter, Obj, Type } from '@dxos/echo';

const client = new Client();

async () => {
  await client.initialize();
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = await client.spaces.create();

  const query = space.db.query(Filter.type(Type.Expando, { type: 'task' }));

  const unsubscribeFn = query.subscribe((query) => {
    query.results.forEach((object) => {
      if (object.type === 'task') {
        // Do something with this task.
      }
    });
  });

  try {
    const taskObject = Obj.make(Type.Expando, {
      type: 'task',
      title: 'buy milk',
    });
    space.db.add(taskObject);
    const eventObject = Obj.make(Type.Expando, {
      type: 'event',
      title: 'arrived at store',
    });
    space.db.add(eventObject);
  } finally {
    unsubscribeFn();
  }
};
