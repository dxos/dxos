//
// Copyright 2022 DXOS.org
//

import { Client, Document } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();

  const { value: spaces } = client.echo.querySpaces();
  const space = spaces[0];

  const object = new Document({ type: 'task', title: 'buy milk' });

  await space.experimental.db.add(object);
})();
