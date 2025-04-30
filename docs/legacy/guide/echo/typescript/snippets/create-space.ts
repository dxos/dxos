//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();
(async () => {
  await client.initialize();

  // ensure an identity exists:
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  // create a space:
  const space = await client.spaces.create();
})();
