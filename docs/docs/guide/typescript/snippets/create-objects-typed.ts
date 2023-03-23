//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Task } from './schema';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();

  const { value: spaces } = client.echo.querySpaces();
  const space = spaces[0];

  const object = new Task({ title: 'buy milk' });

  await space.db.add(object);
})();
