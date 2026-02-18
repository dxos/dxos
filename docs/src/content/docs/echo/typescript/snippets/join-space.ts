//
// Copyright 2022 DXOS.org
//

import { Client, type PublicKey } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();
await client.initialize();

// Ensure an identity exists.
if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}

// Friend decodes the invitation code.
const receivedInvitation = InvitationEncoder.decode('<invitation code here>');

// Accept the invitation.
const invitation = client.spaces.join(receivedInvitation);

// Verify it's secure by sending the second factor authCode.
await invitation.authenticate('<authentication code here>');

// Space joined!
const _space = client.spaces.get(
  invitation.get().spaceKey! as unknown as PublicKey,
);
