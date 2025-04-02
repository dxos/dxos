//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Filter } from '@dxos/client/echo';

import { TaskType } from './schema';

const client = new Client({ types: [TaskType] });
await client.initialize();

// Get a list of all spaces.
const spaces = client.spaces.get();

// Grab a space.
const space = spaces[0];

// Get items that match a filter: type inferred from Task.filter().
const _tasks = await space.db.query(Filter.schema(TaskType)).run();
