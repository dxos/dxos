//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { Operation } from '@dxos/compute';

import { meta } from '#meta';

const CLIENT_OPERATION = `${meta.id}.operation`;

const IdentitySchema = Schema.Struct({
  identityKey: Schema.instanceOf(PublicKey),
  spaceKey: Schema.optional(Schema.instanceOf(PublicKey)),
  profile: Schema.optional(
    Schema.Struct({
      displayName: Schema.optional(Schema.String),
      avatarCid: Schema.optional(Schema.String),
      data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
    }),
  ),
});

const ProfileSchema = Schema.Struct({
  displayName: Schema.optional(Schema.String),
  avatarCid: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
});

export const CreateIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-identity`, name: 'Create Identity', icon: 'ph--user--regular' },
  services: [Capability.Service],
  input: ProfileSchema,
  output: IdentitySchema,
});

export const JoinIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.join-identity`, name: 'Join Identity', icon: 'ph--sign-in--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ShareIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.share-identity`, name: 'Share Identity', icon: 'ph--share-network--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RecoverIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.recover-identity`, name: 'Recover Identity', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const ResetStorage = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.reset-storage`, name: 'Reset Storage', icon: 'ph--warning--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateAgent = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-agent`, name: 'Create Agent', icon: 'ph--brain--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreateRecoveryCode = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-recovery-code`, name: 'Create Recovery Code', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreatePasskey = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-passkey`, name: 'Create Passkey', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemPasskey = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-passkey`, name: 'Redeem Passkey', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemToken = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-token`, name: 'Redeem Token', icon: 'ph--lock--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
});

