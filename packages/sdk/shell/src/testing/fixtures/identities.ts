//
// Copyright 2023 DXOS.org
//

import { IdentityDid, PublicKey } from '@dxos/keys';
import { create, encodePublicKey } from '@dxos/protocols/buf';
import {
  IdentitySchema,
  SpaceMemberSchema,
  SpaceMember_PresenceState,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import type { SpaceMember } from '@dxos/react-client/echo';
import { SpaceMember_Role } from '@dxos/react-client/echo';

export const alice: SpaceMember = create(SpaceMemberSchema, {
  role: SpaceMember_Role.ADMIN,
  presence: SpaceMember_PresenceState.ONLINE,
  identity: create(IdentitySchema, {
    did: IdentityDid.random(),
    identityKey: encodePublicKey(PublicKey.random()),
    profile: create(ProfileDocumentSchema, { displayName: 'Alice' }),
  }),
});
