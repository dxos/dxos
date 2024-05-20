//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/react-client';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';

export const alice: SpaceMember = {
  role: HaloSpaceMember.Role.ADMIN,
  identity: {
    identityKey: PublicKey.random(),
    profile: {
      displayName: 'Alice',
    },
  },
  presence: SpaceMember.PresenceState.ONLINE,
};
