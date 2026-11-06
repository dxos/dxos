//
// Copyright 2026 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const host = new Client();
const guest = new Client();
await Promise.all([host.initialize(), guest.initialize()]);
await Promise.all([host.halo.createIdentity(), guest.halo.createIdentity()]);

// #region list
const spaces = host.spaces.get();
// #endregion

// #region invite
const space = await host.spaces.create({ name: 'Shared notes' });
const invitation = space.share();

// Send this code to the guest; it locates the host and opens a secure connection.
const code = InvitationEncoder.encode(invitation.get());

// Pass this second factor over another channel, such as a QR code or a call.
const authCode = invitation.get().authCode;
// #endregion

// #region join
const accepted = guest.spaces.join(InvitationEncoder.decode(code));
await accepted.authenticate(authCode!);
// #endregion

export { spaces };
