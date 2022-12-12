//
// Copyright 2022 DXOS.org
//

import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

const space = await client.echo.createSpace();

// create an invitation to join the space
const { invitation } = space.createInvitation();

// share this code with a friend, it will be used to locate the peer and
// establish a secure connection
// TODO: ignore the exclamation mark
const code = InvitationEncoder.encode(invitation!);

// later we will pass this second authentication code to our friend over a
// side-channel and they'll send it to us over the new secure connection which
// will verify that it's secure.
// TODO: ignore the exclamation mark
const authCode = invitation?.authenticationCode!;
