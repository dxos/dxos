//
// Copyright 2024 DXOS.org
//

import { type Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client-protocol';

/** Accepts a device join invitation by prompting the user for:
 *    - invitation code
 *    - authentication code */
export const acceptInvitation = async (
  client: Client,
  deviceInvitationCode: string,
) => {
  const decodedInvitation = InvitationEncoder.decode(deviceInvitationCode);
  const invitationResult = client.halo.join(decodedInvitation);

  if (decodedInvitation.authCode) {
    await invitationResult.authenticate(decodedInvitation.authCode);
  } else {
    const authCode = '123456'; // Take this as input from the user.
    await invitationResult.authenticate(authCode);
  }
};
