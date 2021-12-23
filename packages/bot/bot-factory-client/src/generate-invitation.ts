//
// Copyright 2021 DXOS.org
//

import base from 'base-x';

import type { Client, PartyProxy } from '@dxos/client';
import { InvitationDescriptor } from '@dxos/echo-db';

import { Invitation } from './proto/gen/dxos/client';

// Encode with only alpha-numberic characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

export const encodeInvitation = (invitation: InvitationDescriptor) => {
  const buffer = Buffer.from(JSON.stringify(invitation.toQueryParameters()));
  return base62.encode(buffer);
};

export const generateInvitation = async (client: Client, party: PartyProxy): Promise<Invitation> => {
  const invitation = await client.echo.createInvitation(party.key);
  return {
    invitationCode: invitation.invitationCode,
    secret: invitation.pin
  };
};
