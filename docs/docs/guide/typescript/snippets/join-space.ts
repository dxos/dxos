//
// Copyright 2022 DXOS.org
//

import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // friend decodes the invitation code
  const receivedInvitation = InvitationEncoder.decode('<invitation code here>');
  // accept the invitation
  const invitation = client.acceptInvitation(receivedInvitation);
  // verify it's secure by sending the second factor authCode
  await invitation.authenticate('<authentication code here>');
  // space joined!
  const space = client.getSpace(invitation.get().spaceKey!);
})();
