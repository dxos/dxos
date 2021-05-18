//
// Copyright 2021 DXOS.org
//

import { browser, Runtime } from 'webextension-polyfill-ts';

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

import { schema } from '../proto/gen';

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

  const listener = async (message: any, port: Runtime.Port) => {
    try {
      const messageArray = new Uint8Array(Object.values(message)); // an array gets transformed into an object over the messaging.
      const requestEnvelope = schema.getCodecForType('dxos.wallet.extension.RequestEnvelope').decode(messageArray);
      console.log('Message received in background: ', { requestEnvelope, message });
      if (requestEnvelope.req1) {
        const response = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').encode({
          requestId: requestEnvelope.req1.requestId,
          res1: {
            publicKey: profile?.publicKey.toHex(),
            username: profile?.username
          }
        });
        port.postMessage(response);
      } else if (requestEnvelope.req2) {
        const newParty = await client.echo.createParty();
        const response = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').encode({
          requestId: requestEnvelope.req2.requestId,
          res2: {
            partyKey: newParty.key.toHex()
          }
        });
        port.postMessage(response);
      } else if (requestEnvelope.req3) {
        const parties = (await client.echo.queryParties()).value;
        const response = schema.getCodecForType('dxos.wallet.extension.ResponseEnvelope').encode({
          requestId: requestEnvelope.req3.requestId,
          res3: {
            partyKeys: parties.map(party => party.key.toHex())
          }
        });
        port.postMessage(response);
      } else {
        console.log('Unsupported request.', { requestEnvelope, message });
      }
    } catch (error) {
      console.error('Background process failed to process a message.');
      console.log({ error, message });
    }
  };

  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    console.log(`Background process connected on port ${port.name}`);
    port.onMessage.addListener(listener);
  });
})();
