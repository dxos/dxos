//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { defs } from '@dxos/config';
import { SecretProvider, SecretValidator } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';

import { encodeInvitation } from '../utils';

export interface ClientSetup {
  client: Client,
  party: Party,
  invitation: string,
  secret: string
}

export const setupClient = async (config?: defs.Config): Promise<ClientSetup> => {
  const client = new Client(config);
  await client.initialize();
  await client.echo.halo.createProfile({ username: 'Client' });
  await client.echo.open();
  const party = await client.echo.createParty();

  const partySecretString = PublicKey.random().toString();
  const partySecret = Buffer.from(partySecretString);
  const secretProvider: SecretProvider = async () => partySecret;
  const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(partySecret);

  const invitation = await party.createInvitation({ secretProvider, secretValidator });
  return {
    client,
    party,
    invitation: encodeInvitation(invitation),
    secret: partySecretString
  };
};
