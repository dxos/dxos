//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
// import { log } from '@dxos/log';

void (async () => {
  const client = new Client();
  await client.initialize();

  if (!client.halo.profile) {
    await client.halo.createProfile();
  }

  // log(client.toJSON());
})();
