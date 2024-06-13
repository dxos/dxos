//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { Task, types } from './schema';

const client = new Client();

async () => {
  await client.initialize();
  client.addTypes(types);
  // get a list of all spaces
  const spaces = client.spaces.get();
  // grab a space
  const space = spaces[0];
  // get items that match a filter: type inferred from Task.filter()
  const tasks: Task[] = await space.db.query(Task.filter()).run();
};
