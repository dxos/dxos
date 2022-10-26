//
// Copyright 2021 DXOS.org
//

import { Client, Party } from '@dxos/client';
import { Config } from '@dxos/config';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/echo/invitations';

export interface ClientSetup {
  client: Client;
  party: Party;
  invitation: InvitationDescriptor;
}

export const setupClient = async (config?: Config): Promise<ClientSetup> => {
  const client = new Client(config);
  await client.initialize();
  await client.halo.createProfile({ username: 'Client' });
  const party = await client.echo.createParty();

  const invitation = await party.createInvitation();

  return {
    client,
    party,
    invitation: invitation.descriptor.toProto()
  };
};
