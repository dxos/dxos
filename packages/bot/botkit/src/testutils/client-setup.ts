//
// Copyright 2021 DXOS.org
//

import { generateInvitation } from '@dxos/bot-factory-client';
import { Client, PartyProxy } from '@dxos/client';
import { Config } from '@dxos/config';
import { failUndefined } from '@dxos/debug';

export interface ClientSetup {
  client: Client,
  party: PartyProxy,
  invitation: string,
  secret: string
}

export const setupClient = async (config?: Config): Promise<ClientSetup> => {
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile({ username: 'Client' });
  const party = await client.echo.createParty();

  const invitation = await generateInvitation(client, party);

  return {
    client,
    party,
    invitation: invitation.invitationCode ?? failUndefined(),
    secret: invitation.secret ?? failUndefined()
  };
};
