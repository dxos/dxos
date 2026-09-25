//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { IdentityDid } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import {
  type SpaceMember,
  SpaceMember_PresenceState,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { PublicKey } from '@dxos/react-client';

export const alice: SpaceMember = create(SpaceMemberSchema, {
  role: SpaceMember_Role.ADMIN,
  identity: {
    did: IdentityDid.random(),
    identityKey: fromPublicKey(PublicKey.random()),
    profile: {
      displayName: 'Alice',
    },
  },
  presence: SpaceMember_PresenceState.ONLINE,
});
