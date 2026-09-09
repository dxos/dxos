//
// Copyright 2023 DXOS.org
//

import { IdentityDid } from '@dxos/keys';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { PublicKey } from '@dxos/react-client';
import { HaloSpaceMember, SpaceMember } from '@dxos/react-client/echo';

export const alice: SpaceMember = {
  role: SpaceMember_Role.ADMIN,
  identity: {
    did: IdentityDid.random(),
    identityKey: PublicKey.random(),
    profile: {
      displayName: 'Alice',
    },
  },
  presence: SpaceMember_PresenceState.ONLINE,
};
