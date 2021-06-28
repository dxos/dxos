//
// Copyright 2021 DXOS.org
//

import { browser, Runtime } from 'webextension-polyfill-ts';

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { BackgroundServer } from './backgroundServer';
import { wrapPort } from '../popup/utils/wrapPort';

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

  if (!await client.getProfile()) {
    console.log('Creating new profile...');
    await client.createProfile({ ...createKeyPair(), username: 'DXOS User' });
  }

  const profile = await client.getProfile();
  console.log({ profile });

  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    console.log(`Background process connected on port ${port.name}`);

    const server = new BackgroundServer(client, wrapPort(port))
    server.run()
  });
})();
