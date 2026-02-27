//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Obj, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

const client = new Client();

async () => {
  await client.initialize();

  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = await client.spaces.create();

  const object = Obj.make(TestSchema.Expando, { type: 'task', name: 'buy milk' });
  space.db.add(object);

  const names: string[] = [object.name];

  const unsubscribeFn = Obj.subscribe(object, () => {
    names.push(object.name);
  });

  Obj.change(object, (obj) => {
    obj.name = 'buy cookies';
  });

  if (names.join() === ['buy milk', 'buy cookies'].join()) {
    console.log('Success.');
  } else {
    console.log('This will never happen.');
  }

  unsubscribeFn();
};
