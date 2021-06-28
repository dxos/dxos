//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { RpcPort, createRpcServer, RpcPeer } from '@dxos/rpc';
import { schema } from '@dxos/wallet-core';

export class BackgroundServer {
  constructor (private readonly _client: Client, private readonly _port: RpcPort) {}

  public async run () {
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
        }
      },
      port: this._port
    });

    await server.open();
  }
}
