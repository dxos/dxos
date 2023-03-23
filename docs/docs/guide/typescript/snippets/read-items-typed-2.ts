//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Task } from './schema';

const client = new Client();

async () => {
  await client.initialize();
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
  // grab a space
  const space = spaces[0];
  // get items that match a filter: type inferred from Task.filter()
  const tasks = space.db.query(Task.filter());
};
