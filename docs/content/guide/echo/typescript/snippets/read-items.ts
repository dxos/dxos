//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

async () => {
  await client.initialize();

  // get a list of all spaces
  const spaces = client.spaces.get();

  // grab a space
  const space = spaces[0];

  // get all items
  const allObjects = await space.db.query().run();

  // get items that match a filter
  const tasks = await space.db.query({ type: 'task' }).run();

  // get items that match a predicate
  const finishedTasks = await space.db
    .query((doc: any) => doc.type === 'task' && doc.completed)
    .run();
};
