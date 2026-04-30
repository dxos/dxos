//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { Expando } from '@dxos/schema';

const client = new Client();
await client.initialize();

// Get a list of all spaces.
const spaces = client.spaces.get();

// Grab a space.
const space = spaces[0];

// Get all items.
const _allObjects = await space.db.query(Filter.everything()).run();

// Get items that match a filter.
const _tasks = await space.db
  .query(Filter.type(Expando.Expando, { type: 'task' }))
  .run();

// Get items that match a predicate.
const _finishedTasks = await space.db
  .query(Filter.type(Expando.Expando, { type: 'task', completed: true }))
  .run();
