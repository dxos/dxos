//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();
await client.initialize();

// Get a list of all spaces.
const spaces = client.spaces.get();

// Grab a space.
const space = spaces[0];

// Get all items.
const _allObjects = await space.db.query().run();

// Get items that match a filter.
const _tasks = await space.db.query({ type: 'task' }).run();

// Get items that match a predicate.
const _finishedTasks = await space.db
  .query((doc: any) => doc.type === 'task' && doc.completed)
  .run();
