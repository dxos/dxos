//
// Copyright 2022 DXOS.org
//

import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();
  // friend decodes the invitation code
  const receivedInvitation = InvitationEncoder.decode('<invitation code here>');
  // accept the invitation
  const { authenticate, invitation } = client.echo.acceptInvitation(receivedInvitation);
  // verify it's secure by sending the second factor authCode
  await authenticate('<authentication code here>');
  // space joined!
  const space = client.echo.getSpace(invitation?.spaceKey!);
})();
