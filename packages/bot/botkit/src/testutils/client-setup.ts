//
// Copyright 2021 DXOS.org
//

import { Client, PartyProxy } from '@dxos/client';
import type { defs } from '@dxos/config';
import { SecretProvider } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import { encodeInvitation } from '../utils';

export interface ClientSetup {
  client: Client,
  party: PartyProxy,
  invitation: string,
  secret: string
}

export const setupClient = async (config?: defs.Config): Promise<ClientSetup> => {
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile({ username: 'Client' });
  const party = await client.echo.createParty();

  const partySecretString = PublicKey.random().toString();
  const partySecret = Buffer.from(partySecretString);
  const secretProvider: SecretProvider = async () => partySecret;

  const invitation = await client.echo.createInvitation(party.key, { secretProvider });
  return {
    client,
    party,
    invitation: encodeInvitation(invitation),
    secret: partySecretString
  };
};
