//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Expando, Filter } from '@dxos/client/echo';

const client = new Client();

async () => {
  await client.initialize();

  // get a list of all spaces
  const spaces = client.spaces.get();

  // grab a space
  const space = spaces[0];

  // get all items
  const allObjects = await space.db.query(Filter.everything()).run();

  // get items that match a filter
  const tasks = await space.db.query(Filter.type(Expando, { type: 'task' })).run();
};
