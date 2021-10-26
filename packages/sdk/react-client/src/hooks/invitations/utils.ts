//
// Copyright 2020 DXOS.org
//

import base from 'base-x';

import { InvitationDescriptor } from '@dxos/echo-db';

// Encode with only alpha-numberic characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

export const encodeInvitation = (invitation: InvitationDescriptor) => {
  const buffer = Buffer.from(JSON.stringify(invitation.toQueryParameters()));
  return base62.encode(buffer);
};

export const decodeInvitation = (code: string) => {
  const json = base62.decode(code).toString();
  return InvitationDescriptor.fromQueryParameters(JSON.parse(json));
};

// TODO(burdon): Factor out.
export const noOp = () => null;
