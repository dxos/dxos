//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { Expando, create } from '@dxos/client/echo';

const client = new Client();

async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();

  const space = await client.spaces.create();

  const query = space.db.query({ type: 'task' });

  const unsubscribeFn = query.subscribe(({ objects }) => {
    objects.forEach(object => {
      if (object.type === 'task') {
        console.log('Do something with this task');
      } else {
        throw new Error('Non-task object returned (this will never happen)');
      }
    });
  });

  try {
    const taskObject = create(Expando, { type: 'task', title: 'buy milk' });
    space.db.add(taskObject);
    const eventObject = create(Expando, { type: 'event', title: 'arrived at store' });
    space.db.add(eventObject);
  } finally  {
    unsubscribeFn();
  }
};
