//
// Copyright 2021 DXOS.org
//

import { Client, PartyProxy } from '@dxos/client';
import { Config } from '@dxos/config';

import * as proto from '../proto/gen/dxos/echo/invitation';

export interface ClientSetup {
  client: Client,
  party: PartyProxy,
  invitation: proto.InvitationDescriptor,
}

export const setupClient = async (config?: Config): Promise<ClientSetup> => {
  const client = new Client(config?.values);
  await client.initialize();
  await client.halo.createProfile({ username: 'Client' });
  const party = await client.echo.createParty();

  const invitation = await client.echo.createInvitation(party.key);

  return {
    client,
    party,
    invitation: invitation.descriptor.toProto()
  };
};
