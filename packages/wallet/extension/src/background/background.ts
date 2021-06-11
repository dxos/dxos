//
// Copyright 2021 DXOS.org
//

import { browser, Runtime } from 'webextension-polyfill-ts';

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { schema, RpcServer, wrapPort, ResponseStream } from '@dxos/wallet-core';

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

  const requestHandler: (method: string, request: Uint8Array) => Promise<Uint8Array | ResponseStream> = async (method, request) => {
    if (method === 'GetProfile') {
      return schema.getCodecForType('dxos.wallet.extension.GetProfileResponse').encode({
        publicKey: profile?.publicKey.toHex(),
        username: profile?.username
      });
    } else if (method === 'GetParties') {
      const responseStream = new ResponseStream();
      (await client.echo.queryParties()).subscribe((parties) => {
        const responseItem = schema.getCodecForType('dxos.wallet.extension.GetPartiesResponse').encode({
          partyKeys: parties.map(party => party.key.toHex())
        });
        responseStream.message.emit(responseItem);
      });
      return responseStream;
    } else if (method === 'CreateParty') {
      const newParty = await client.echo.createParty();
      return schema.getCodecForType('dxos.wallet.extension.CreatePartyResponse').encode({
        partyKey: newParty.key.toHex()
      });
    } else if (method === 'SignMessage') {
      const signMessageRequest = schema.getCodecForType('dxos.wallet.extension.SignMessageRequest').decode(request);
      return schema.getCodecForType('dxos.wallet.extension.SignMessageResponse').encode({
        publicKey: profile?.publicKey.toHex(),
        username: profile?.username,
        signedMessage: client.echo.keyring.sign(signMessageRequest.message, client.echo.keyring.keys).signed.payload
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
