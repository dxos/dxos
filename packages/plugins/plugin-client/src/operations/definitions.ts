//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as OperationTag from '@dxos/app-toolkit/OperationTag';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { DXN, IdentityDid, SpaceId } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

const IdentitySchema = Schema.Struct({
  identityDid: IdentityDid,
  spaceId: Schema.optional(SpaceId),
  profile: Schema.optional(
    Schema.Struct({
      displayName: Schema.optional(Schema.String),
      avatarCid: Schema.optional(Schema.String),
      data: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
    }),
  ),
});

const ProfileSchema = Schema.Struct({
  displayName: Schema.optional(Schema.String),
  avatarCid: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
});

export const CreateIdentity = Operation.make({
  meta: {
    key: makeKey('createIdentity'),
    name: 'Create Identity',
    icon: 'ph--user--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service, Identity.Service],
  input: ProfileSchema,
  output: IdentitySchema,
});

export const UpdateProfile = Operation.make({
  meta: {
    key: makeKey('updateProfile'),
    name: 'Update Profile',
    icon: 'ph--user--regular',
    tags: [OperationTag.Identity],
  },
  services: [Identity.Service],
  input: ProfileSchema,
  output: Schema.Void,
});

export const JoinIdentity = Operation.make({
  meta: {
    key: makeKey('joinIdentity'),
    name: 'Join Identity',
    icon: 'ph--sign-in--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ShareIdentity = Operation.make({
  meta: {
    key: makeKey('shareIdentity'),
    name: 'Share Identity',
    icon: 'ph--share-network--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const OpenUsage = Operation.make({
  meta: {
    key: makeKey('openUsage'),
    name: 'Open Usage',
    icon: 'ph--chart-bar--regular',
    tags: [OperationTag.Layout],
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RecoverIdentity = Operation.make({
  meta: {
    key: makeKey('recoverIdentity'),
    name: 'Recover Identity',
    icon: 'ph--key--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const ResetStorage = Operation.make({
  meta: {
    key: makeKey('resetStorage'),
    name: 'Reset Storage',
    icon: 'ph--warning--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service],
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateAgent = Operation.make({
  meta: {
    key: makeKey('createAgent'),
    name: 'Create Agent',
    icon: 'ph--brain--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const GrantServiceAccess = Operation.make({
  meta: {
    key: makeKey('grantServiceAccess'),
    name: 'Grant Service Access',
    icon: 'ph--key--regular',
    tags: [OperationTag.Identity],
  },
  services: [Identity.Service],
  input: Schema.Struct({
    /** Target server name (e.g. `hub.dxos.network`). */
    serverName: Schema.String,
    /** Capabilities to grant (e.g. `['composer:beta']`). */
    capabilities: Schema.Array(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateRecoveryCode = Operation.make({
  meta: {
    key: makeKey('createRecoveryCode'),
    name: 'Create Recovery Code',
    icon: 'ph--key--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreatePasskey = Operation.make({
  meta: {
    key: makeKey('createPasskey'),
    name: 'Create Passkey',
    icon: 'ph--key--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RevokeRecoveryCredential = Operation.make({
  meta: {
    key: makeKey('revokeRecoveryCredential'),
    name: 'Revoke Recovery Credential',
    icon: 'ph--key--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Struct({
    /**
     * Lookup key of the credential to revoke, as hex. Constrained to a full key because
     * `PublicKey.from` silently drops non-hex characters rather than rejecting them, so an
     * unvalidated string would decode to some other key instead of failing.
     */
    lookupKey: Schema.String.check(Schema.isPattern(/^[0-9a-fA-F]{64}$/)),
  }),
  output: Schema.Void,
});

export const RedeemPasskey = Operation.make({
  meta: {
    key: makeKey('redeemPasskey'),
    name: 'Redeem Passkey',
    icon: 'ph--key--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemToken = Operation.make({
  meta: {
    key: makeKey('redeemToken'),
    name: 'Redeem Token',
    icon: 'ph--lock--regular',
    tags: [OperationTag.Identity],
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
});
