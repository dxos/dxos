//
// Copyright 2022 DXOS.org
//

import { Client, InvitationEncoder } from "@dxos/client";

const client = new Client();

// friend decodes the invitation code
const receivedInvitation = InvitationEncoder.decode("<invitation code here>");

// accept the invitation
const { authenticate } = client.echo.acceptInvitation(receivedInvitation);

// verify it's secure by sending the second factor authCode from above
await authenticate("<authentication code here>");

// space joined!
const { value: spaces } = await client.echo.querySpaces();
