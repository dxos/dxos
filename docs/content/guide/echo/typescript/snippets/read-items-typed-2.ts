//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Filter } from '@dxos/client/echo';

import { TaskType } from './schema';

const client = new Client();

async () => {
  await client.initialize();
  client.addTypes([TaskType]);

  // get a list of all spaces
  const spaces = client.spaces.get();

  // grab a space
  const space = spaces[0];

  // get items that match a filter: type inferred from Task.filter()
  const tasks = await space.db.query(Filter.schema(TaskType)).run();
};
