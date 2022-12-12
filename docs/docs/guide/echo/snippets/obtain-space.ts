//
// Copyright 2022 DXOS.org
//

import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

// create a space
const space = await client.echo.createSpace();

// get spaces
const { value: spaces, subscribe } = client.echo.querySpaces();

// create an invitation to join the space, it will be used to locate the inviter
// in the MESH and to create a secured peer connection
const { invitation } = space.createInvitation();

// share this code with a friend, it will be used to establish a secure
// connection TODO: ignore the exclamation mark
const code = InvitationEncoder.encode(invitation!);

// later we will pass this second authentication code to our friend over a
// side-channel and they'll send it to us over the new secure connection which
// will verify that it's secure.
const authCode = invitation?.authenticationCode!;

// ===== on the receiver's side:

// friend decodes the invitation code
const receivedInvitation = InvitationEncoder.decode(code);

// accept the invitation
const { authenticate } = client.echo.acceptInvitation(receivedInvitation);

// verify it's secure by sending the second factor authCode from above TODO:
// ignore exclamation mark
const result = authenticate(authCode!);
