//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

const client = new Client();
await client.initialize();

// Ensure an identity exists.
if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}

// Get a list of all spaces.
const spaces = client.spaces.get();

// Grab a space.
const space = spaces[0];

// Grab an object.
const result = await space.db
  .query(Filter.type(TestSchema.Expando, { type: 'task' }))
  .run();
const object = result[0];

// Mutate the object using Obj.change.
Obj.change(object, (o) => {
  o.completed = true;
});
