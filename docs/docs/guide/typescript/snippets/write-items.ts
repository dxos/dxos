//
// Copyright 2022 DXOS.org
//

import { Client, DocumentModel } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile()
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
  // grab a space
  const space = spaces[0];
  // grab an object
  const result = space.experimental.db.query({ type: 'task' });
  const object = result.objects[0];
  // mutate the object directly
  object.isCompleted = true;
})()
