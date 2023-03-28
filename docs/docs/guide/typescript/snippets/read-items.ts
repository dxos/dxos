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
  const allObjects = space.db.query();
  // get items that match a filter
  const tasks = space.db.query({ type: 'task' });
  // get items that match a predicate
  const finishedTasks = space.db.query(
    (doc) => doc.type == 'task' && doc.isCompleted
  );
};
