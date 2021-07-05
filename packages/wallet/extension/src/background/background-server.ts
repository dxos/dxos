//
// Copyright 2021 DXOS.org
//

import { Client, ClientConfig } from '@dxos/client';
import { createKeyPair } from '@dxos/crypto';
import { RpcPort, createRpcServer, RpcPeer } from '@dxos/rpc';
import { schema } from '@dxos/wallet-core';

const config: ClientConfig = {
  storage: {
    persistent: true,
    type: 'idb',
    path: '/tmp/dxos'
  }
};

export class BackgroundServer {
  private _client: Client = new Client(config);

  constructor (private readonly _port: RpcPort) {}

  public async run () {
    await this._client.initialize();
    const service = schema.getService('dxos.wallet.extension.BackgroundService');
    const server: RpcPeer = createRpcServer({
      service,
      handlers: {
        GetProfile: async () => {
          const profile = this._client.getProfile();
          return {
            publicKey: profile?.publicKey.toHex(),
            username: profile?.username
          };
        },
        CreateParty: async () => {
          const newParty = await this._client.echo.createParty();
          return {
            partyKey: newParty.key.toHex()
          };
        },
        SignMessage: async request => {
          const profile = this._client.getProfile();
          return {
            publicKey: profile?.publicKey.toHex(),
            username: profile?.username,
            signedMessage: this._client.echo.keyring.sign(request.message, this._client.echo.keyring.keys).signed.payload
          };
        },
        CreateProfile: async request => {
          await this._client.createProfile({ ...createKeyPair(), ...request });
          return {
            username: this._client.getProfile()?.username,
            publicKey: this._client.getProfile()?.publicKey.toHex()
          };
        }
      },
      port: this._port
    });

    await server.open();
  }
}
