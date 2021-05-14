//
// Copyright 2021 DXOS.org
//

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

const config: ClientConfig = {
  storage: {
    persistent: true,
    type: 'idb',
    path: '/tmp/dxos'
  }
};

(async () => {
  console.log('Creating client...');
  const client = new Client(config);
  await client.initialize();

  const profile = await client.getProfile();
  console.log({ profile });

  if (!profile) {
    console.log('Creating new profile...');
    await client.createProfile({ ...createKeyPair(), username: 'DXOS User' });
    console.log({ profile: await client.getProfile() });
  }
})();
