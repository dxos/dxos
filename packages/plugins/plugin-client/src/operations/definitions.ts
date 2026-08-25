//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { DXN, IdentityDid, SpaceId } from '@dxos/keys';

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
    key: DXN.make('org.dxos.operation.client.createIdentity'),
    name: 'Create Identity',
    icon: 'ph--user--regular',
  },
  services: [Capability.Service, Identity.Service],
  input: ProfileSchema,
  output: IdentitySchema,
});

export const UpdateProfile = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.updateProfile'),
    name: 'Update Profile',
    icon: 'ph--user--regular',
  },
  services: [Identity.Service],
  input: ProfileSchema,
  output: Schema.Void,
});

export const JoinIdentity = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.joinIdentity'),
    name: 'Join Identity',
    icon: 'ph--sign-in--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ShareIdentity = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.shareIdentity'),
    name: 'Share Identity',
    icon: 'ph--share-network--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const OpenUsage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.openUsage'),
    name: 'Open Usage',
    icon: 'ph--chart-bar--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RecoverIdentity = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.recoverIdentity'),
    name: 'Recover Identity',
    icon: 'ph--key--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const ResetStorage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.resetStorage'),
    name: 'Reset Storage',
    icon: 'ph--warning--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.createAgent'),
    name: 'Create Agent',
    icon: 'ph--brain--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const GrantServiceAccess = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.grantServiceAccess'),
    name: 'Grant Service Access',
    icon: 'ph--key--regular',
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
    key: DXN.make('org.dxos.operation.client.createRecoveryCode'),
    name: 'Create Recovery Code',
    icon: 'ph--key--regular',
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreatePasskey = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.createPasskey'),
    name: 'Create Passkey',
    icon: 'ph--key--regular',
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RevokeRecoveryCredential = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.revokeRecoveryCredential'),
    name: 'Revoke Recovery Credential',
    icon: 'ph--key--regular',
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
    key: DXN.make('org.dxos.operation.client.redeemPasskey'),
    name: 'Redeem Passkey',
    icon: 'ph--key--regular',
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemToken = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.client.redeemToken'),
    name: 'Redeem Token',
    icon: 'ph--lock--regular',
  },
  services: [Capability.Service, Identity.Service],
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
});
