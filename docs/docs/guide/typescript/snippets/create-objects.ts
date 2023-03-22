//
// Copyright 2022 DXOS.org
//

import { Client, Expando } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();

  // TODO(burdon): Update.
  const { value: spaces } = client.echo.querySpaces();
  const space = spaces[0];

  const object = new Expando({ type: 'task', title: 'buy milk' });

  await space.db.add(object);
})();
