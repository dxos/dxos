//
// Copyright 2026 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

import { openContacts } from '../client.ts';
import { types } from '../schema.ts';

// #region invite
const { space } = await openContacts();
const invitation = space.share();

// Send this code to the guest; it locates the host and opens a secure connection.
const code = InvitationEncoder.encode(invitation.get());

// Pass this second factor over another channel, such as a QR code or a call.
const authCode = invitation.get().authCode;
// #endregion

// #region join
const guest = new Client({ types });
await guest.initialize();
await guest.halo.createIdentity();

const accepted = guest.spaces.join(InvitationEncoder.decode(code));
await accepted.authenticate(authCode!);
// #endregion

// #region list
// The space appears among the guest's spaces once the invitation succeeds.
const spaces = guest.spaces.get();
// #endregion

export { spaces };
