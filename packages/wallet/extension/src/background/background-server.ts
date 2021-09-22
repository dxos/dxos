//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf';
import { createKeyPair, keyPairFromSeedPhrase } from '@dxos/crypto';
import { decodeInvitation } from '@dxos/react-client';
import { RpcPort, createRpcServer, RpcPeer } from '@dxos/rpc';
import { schema } from '@dxos/wallet-core';

import { config } from './config';

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
          const profile = this._client.halo.getProfile();
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
          const profile = this._client.halo.getProfile();
          return {
            publicKey: profile?.publicKey.toHex(),
            username: profile?.username,
            signedMessage: this._client.echo.halo.keyring.sign(request.message, this._client.echo.halo.keyring.keys).signed.payload
          };
        },
        CreateProfile: async request => {
          await this._client.halo.createProfile({ ...createKeyPair(), ...request });
          return {
            username: this._client.halo.getProfile()?.username,
            publicKey: this._client.halo.getProfile()?.publicKey.toHex()
          };
        },
        RestoreProfile: async request => {
          if (!request.seedPhrase || !request.username) {
            throw new Error('Seedphrase and username are required.');
          }
          const keyPair = keyPairFromSeedPhrase(request.seedPhrase);
          await this._client.halo.createProfile({ ...keyPair, username: request.username });
          return {
            username: this._client.halo.getProfile()?.username,
            publicKey: this._client.halo.getProfile()?.publicKey.toHex()
          };
        },
        GetParties: async request => {
          const parties = this._client.echo.queryParties().value;
          return {
            partyKeys: parties.map(party => party.key.toHex())
          };
        },
        SubscribeToParties: request => {
          return new Stream(({ next, close }) => {
            const query = this._client.echo.queryParties();
            // Send first value immidiately.
            next({ partyKeys: query.value.map(party => party.key.toHex()) });
            // TODO(rzadp): Unsubscribe - when and how?
            query.subscribe(result => next({
              partyKeys: result.map(party => party.key.toHex())
            }));
          });
        },
        JoinParty: async request => {
          if (!request.invitation) {
            throw new Error('Invitation is missing.');
          }
          const invitation = decodeInvitation(request.invitation);
          try {
            const joinedParty = await this._client.echo.joinParty(invitation, request.passcode ? async () => Buffer.from(request.passcode!) : undefined);
            return {
              partyKey: joinedParty.key.toHex()
            };
          } catch (err) {
            console.error('Joining party failed');
            console.error(err);
            throw err;
          }
        },
        RedeemDevice: async request => {
          if (!request.invitation) {
            throw new Error('Invitation is missing.');
          }
          const invitation = decodeInvitation(request.invitation);
          try {
            const joinedParty = await this._client.halo.join(invitation, async () => Buffer.from(request.passcode!));
            return {
              partyKey: joinedParty.key.toHex()
            };
          } catch (err) {
            console.error('Redeeming device invitation failed');
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
