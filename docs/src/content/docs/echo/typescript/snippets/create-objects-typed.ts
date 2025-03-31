//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { create } from '@dxos/client/echo';

import { TaskType } from './schema';

const client = new Client({ types: [TaskType] });

await client.initialize();

// Ensure an identity exists.
if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}

// Get a list of all spaces.
const spaces = client.spaces.get();

// Grab a space.
const space = spaces[0];

// Create an object.
const object = create(TaskType, { name: 'buy milk' });

// Add the object to the space.
space.db.add(object);
