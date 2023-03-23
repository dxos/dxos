//
// Copyright 2022 DXOS.org
//

import { Client, TypedObject } from '@dxos/client';

const client = new Client();

class Task extends TypedObject {
  public declare type: 'task';
  public declare isCompleted: boolean;
}

async () => {
  await client.initialize();
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
  // grab a space
  const space = spaces[0];
  // get items that match a filter
  const tasks = space.db.query<Task>({ type: 'task' });
};
