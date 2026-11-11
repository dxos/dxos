//
// Copyright 2026 DXOS.org
//

import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';
import { invariant } from '@dxos/invariant';

import { openContacts } from '../client.ts';
import { types } from '../schema.ts';

// #region invite
const { space } = await openContacts();
const invitation = space.share();

// Send the code and the auth code to the guest over different channels.
const code = InvitationEncoder.encode(invitation.get());
const { authCode } = invitation.get();
invariant(authCode);
// #endregion

// #region join
const guest = new Client({ types });
await guest.initialize();
await guest.halo.createIdentity();

const accepted = guest.spaces.join(InvitationEncoder.decode(code));
await accepted.authenticate(authCode);
// #endregion

// #region list
const spaces = guest.spaces.get();
// #endregion

export { spaces };
