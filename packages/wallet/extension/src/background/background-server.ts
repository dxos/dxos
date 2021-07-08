//
// Copyright 2021 DXOS.org
//

import { Client, ClientConfig } from '@dxos/client';
import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { RpcPort, createRpcServer, RpcPeer } from '@dxos/rpc';
import { schema } from '@dxos/wallet-core';
import { InvitationDescriptor } from '@dxos/echo-db';

const config: ClientConfig = {
  storage: {
    persistent: true,
    type: 'idb',
    path: '/tmp/dxos'
  },
  swarm: {
    signal: 'wss://apollo2.kube.moon.dxos.network/dxos/signal',
    ice: [
      { urls: 'stun:apollo2.kube.moon.dxos.network:3478' },
      {
        urls: 'turn:apollo2.kube.moon.dxos.network:3478',
        username: 'dxos',
        credential: 'dxos'
      },
    ]
  }
};

const encodeInvitation = (invitation: InvitationDescriptor) => btoa(JSON.stringify(invitation.toQueryParameters()));
const decodeInvitation = (code: string) => InvitationDescriptor.fromQueryParameters(JSON.parse(atob(code)));

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
        },
        RestoreProfile: async request => {
          if (!request.seedPhrase || !request.username) {
            throw new Error('Seedphrase and username are required.');
          }
          const keyPair = keyPairFromSeedPhrase(request.seedPhrase);
          await this._client.createProfile({ ...keyPair, username: request.username });
          return {
            username: this._client.getProfile()?.username,
            publicKey: this._client.getProfile()?.publicKey.toHex()
          };
        },
        GetParties: async request => {
          const parties = this._client.echo.queryParties().value;
          return {
            partyKeys: parties.map(party => party.key.toHex())
          }
        },
        JoinParty: async request => {
          if (!request.invitation) {
            throw new Error('Invitation is missing.')
          }
          const invitation = decodeInvitation(request.invitation)
          try {
            const joinedParty = await this._client.echo.joinParty(invitation, request.passcode ? (async () => Buffer.from(request.passcode!)) : undefined)
            return {
              partyKey: joinedParty.key.toHex()
            };
          } catch(err) {
            console.error('Joining party failed')
            console.error(err);
            throw err;
          }
        }
      },
      port: this._port
    });

    await server.open();
  }
}
