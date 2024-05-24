//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // friend decodes the invitation code
  const receivedInvitation = InvitationEncoder.decode('<invitation code here>');
  // accept the invitation
  const invitation = client.spaces.join(receivedInvitation);
  // verify it's secure by sending the second factor authCode
  await invitation.authenticate('<authentication code here>');
  // space joined!
  const space = client.spaces.get(invitation.get().spaceKey!);
})();
