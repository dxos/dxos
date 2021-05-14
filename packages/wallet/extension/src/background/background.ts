//
// Copyright 2021 DXOS.org
//

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

import { browser, Runtime } from "webextension-polyfill-ts";

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
  
  const profile = await client.getProfile()
  console.log({ profile });

  const listener = (request: any, sender: Runtime.MessageSender) => {
    console.log('Message received', {request, sender})
    if (request.method === 'GetProfile') {
      console.log('returning..', profile)
      return Promise.resolve(profile);
    }
    return;
  }

  browser.runtime.onMessage.addListener(listener as any)
})();
