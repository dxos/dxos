//
// Copyright 2021 DXOS.org
//

import { browser, Runtime } from 'webextension-polyfill-ts';

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

  if (!await client.getProfile()) {
    console.log('Creating new profile...');
    await client.createProfile({ ...createKeyPair(), username: 'DXOS User' });
  }

  const profile = await client.getProfile();
  console.log({ profile });

  const listener = (request: any, port: Runtime.Port) => {
    console.log('Message received in background: ', { request });
    if (request.method === 'GetProfile') {
      const result = profile ? {
        method: 'ResponseProfile',
        data: { ...profile, publicKey: profile.publicKey.toHex() }
      } : null;
      console.log('returning..', result);
      port.postMessage(result);
    }
  };

  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    console.log(`Background process connected on port ${port.name}`);
    port.onMessage.addListener(listener);
  });
})();
