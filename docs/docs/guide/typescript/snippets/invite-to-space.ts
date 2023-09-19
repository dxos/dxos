//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();

(async () => {
  await client.initialize();
  // ensure an identity exists
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // create a space
  const space = await client.spaces.create();
  // create an invitation to join the space
  const invitation = space.share();
  // share this code with a friend, it will be used to locate the peer and
  // establish a secure connection
  const code = InvitationEncoder.encode(invitation.get());
  // later we will pass this second authentication code to our friend over a
  // side-channel and they'll send it to us over the new connection which
  // will verify that it's secure.
  const authCode = invitation.get().authCode;
})()
