//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';
import { registerSignalRuntime } from '@dxos/echo-signals';

registerSignalRuntime();

const client = new Client();

async () => {
  await client.initialize();

  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = await client.spaces.create();

  const object = create(Expando, { type: 'task', name: 'buy milk' });
  space.db.add(object);

  const names: string[] = [];

  const unsubscribeFn = effect(() => {
    names.push(object.title);
  });

  object.name = 'buy cookies';

  if (names.join() === ['buy milk', 'buy cookies'].join()) {
    console.log('Success.');
  } else {
    console.log('This will never happen.');
  }

  unsubscribeFn();
};
