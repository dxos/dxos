//
// Copyright 2021 DXOS.org
//

import { browser, Runtime } from 'webextension-polyfill-ts';

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';

import { schema } from '../proto/gen';
import { RpcServer, wrapPort } from '../services';

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

  const requestHandler: (method: string, request: Uint8Array) => Promise<Uint8Array> = async (method, request) => {
    // request is not used anywhere yet because we have parameter-less requests at the moment.
    if (method === 'GetProfile') {

      return schema.getCodecForType('dxos.wallet.extension.GetProfileResponse').encode({
        publicKey: profile?.publicKey.toHex(),
        username: profile?.username
      });
    } else if (method === 'GetParties') {
      const parties = (await client.echo.queryParties()).value;
      return schema.getCodecForType('dxos.wallet.extension.GetPartiesResponse').encode({
        partyKeys: parties.map(party => party.key.toHex())
      });
    } else if (method === 'CreateParty') {
      const newParty = await client.echo.createParty();
      return schema.getCodecForType('dxos.wallet.extension.CreatePartyResponse').encode({
        partyKey: newParty.key.toHex()
      });
    } else {
      console.log('Unsupported method: ', method);
      return new Uint8Array();
    }
  };

  const rpcServer = new RpcServer(requestHandler);

  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    console.log(`Background process connected on port ${port.name}`);

    rpcServer.handleConnection(wrapPort(port));
  });
})();
