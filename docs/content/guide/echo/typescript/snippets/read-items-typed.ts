//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { TypedObject } from '@dxos/client/echo';

const client = new Client();

class Task extends TypedObject {
  public declare type: 'task';
  public declare isCompleted: boolean;
}

async () => {
  await client.initialize();
  // get a list of all spaces
  const spaces = client.spaces.get();
  // grab a space
  const space = spaces[0];
  // get items that match a filter
  // TODO(wittjosiah): Fix type inference.
  // @ts-ignore
  const tasks = space.db.query<Task>({ type: 'task' });
};
