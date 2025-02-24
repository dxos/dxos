//
// Copyright 2023 DXOS.org
//

import { IdentityDid } from '@dxos/keys';
import { PublicKey } from '@dxos/react-client';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';

export const alice: SpaceMember = {
  role: HaloSpaceMember.Role.ADMIN,
  identity: {
    did: IdentityDid.random(),
    identityKey: PublicKey.random(),
    profile: {
      displayName: 'Alice',
    },
  },
  presence: SpaceMember.PresenceState.ONLINE,
};
