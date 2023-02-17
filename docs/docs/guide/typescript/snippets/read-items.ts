//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

async () => {
  await client.initialize();
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
  // grab a space
  const space = spaces[0];
  // get all items:
  const allObjects = space.experimental.db.query();
  // get items that match a filter
  const tasks = space.experimental.db.query({ type: 'task' });
};
