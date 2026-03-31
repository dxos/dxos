//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

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
  meta: { key: `${CLIENT_OPERATION}.create-identity`, name: 'Create Identity' },
  services: [Capability.Service],
  input: ProfileSchema,
  output: IdentitySchema,
});

export const JoinIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.join-identity`, name: 'Join Identity' },
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ShareIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.share-identity`, name: 'Share Identity' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RecoverIdentity = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.recover-identity`, name: 'Recover Identity' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const ResetStorage = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.reset-storage`, name: 'Reset Storage' },
  services: [Capability.Service],
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateAgent = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-agent`, name: 'Create Agent' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreateRecoveryCode = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-recovery-code`, name: 'Create Recovery Code' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreatePasskey = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.create-passkey`, name: 'Create Passkey' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemPasskey = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-passkey`, name: 'Redeem Passkey' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemToken = Operation.make({
  meta: { key: `${CLIENT_OPERATION}.redeem-token`, name: 'Redeem Token' },
  services: [Capability.Service],
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
});
