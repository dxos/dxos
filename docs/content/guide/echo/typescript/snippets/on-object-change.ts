//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';
import { effect } from '@preact/signals-core';
import { registerSignalRuntime } from '@dxos/echo-signals';

registerSignalRuntime();

const client = new Client();

async () => {
  await client.initialize();

  if (!client.halo.identity.get()) await client.halo.createIdentity();

  const space = await client.spaces.create();

  const object = create(Expando, { type: 'task', title: "buy milk" });
  space.db.add(object);

  let titles: string[] = []

  const unsubscribeFn = effect(() => {
    titles.push(object.title);
  })

  object.title = "buy cookies"

  if (titles.join() === ["buy milk", "buy cookies"].join()) {
    console.log("Success.");
  } else {
    console.log("This will never happen.");
  }
}
