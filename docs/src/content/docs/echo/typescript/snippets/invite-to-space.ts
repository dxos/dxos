//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();
await client.initialize();

// Ensure an identity exists.
if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}

// Create a space.
const space = await client.spaces.create();

// Create an invitation to join the space.
const invitation = space.share();

// Share this code with a friend, it will be used to locate the peer and
// establish a secure connection.
const _code = InvitationEncoder.encode(invitation.get());

// Later we will pass this second authentication code to our friend over a
// side-channel and they'll send it to us over the new connection which
// will verify that it's secure.
const _authCode = invitation.get().authCode;
