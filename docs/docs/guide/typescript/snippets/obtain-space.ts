//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();

// create a space
const space = await client.createSpace();

// get spaces
const spaces = client.spaces.get();

// create an invitation to join the space, it will be used to locate the inviter
// in the MESH and to create a secured peer connection
const invitation = space.createInvitation();

// share this code with a friend, it will be used to establish a secure
// connection TODO: ignore the exclamation mark
const code = InvitationEncoder.encode(invitation.get());

// later we will pass this second authentication code to our friend over a
// side-channel and they'll send it to us over the new secure connection which
// will verify that it's secure.
const authCode = invitation.get().authCode!;

// ===== on the receiver's side:

// friend decodes the invitation code
const receivedInvitation = InvitationEncoder.decode(code);

// accept the invitation
const { authenticate } = client.acceptInvitation(receivedInvitation);

// verify it's secure by sending the second factor authCode from above TODO:
// ignore exclamation mark
const result = authenticate(authCode!);
