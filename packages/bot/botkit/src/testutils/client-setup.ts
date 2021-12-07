//
// Copyright 2021 DXOS.org
//

import { generateInvitation } from '@dxos/bot-factory-client';
import { Client, PartyProxy } from '@dxos/client';
import type { defs } from '@dxos/config';

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

  const invitation = await generateInvitation(client, party);

  return {
    client,
    party,
    invitation: invitation.invitationCode,
    secret: invitation.secret
  };
};
