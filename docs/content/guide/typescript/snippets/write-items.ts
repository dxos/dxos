//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // get a list of all spaces
  const spaces = client.spaces.get();
  // grab a space
  const space = spaces[0];
  // grab an object
  const result = await space.db.query({ type: 'task' }).run();
  const object = result.objects[0];
  // mutate the object directly
  object.isCompleted = true;
})();
