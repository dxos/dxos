//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const CLIENT_OPERATION = `${DXN.getName(meta.id)}.operation`;

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
  meta: { key: DXN.make(`${CLIENT_OPERATION}.createIdentity`), name: 'Create Identity', icon: 'ph--user--regular' },
  services: [Capability.Service],
  input: ProfileSchema,
  output: IdentitySchema,
});

export const JoinIdentity = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.joinIdentity`), name: 'Join Identity', icon: 'ph--sign-in--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ShareIdentity = Operation.make({
  meta: {
    key: DXN.make(`${CLIENT_OPERATION}.shareIdentity`),
    name: 'Share Identity',
    icon: 'ph--share-network--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RecoverIdentity = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.recoverIdentity`), name: 'Recover Identity', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const ResetStorage = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.resetStorage`), name: 'Reset Storage', icon: 'ph--warning--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const CreateAgent = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.createAgent`), name: 'Create Agent', icon: 'ph--brain--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreateRecoveryCode = Operation.make({
  meta: {
    key: DXN.make(`${CLIENT_OPERATION}.createRecoveryCode`),
    name: 'Create Recovery Code',
    icon: 'ph--key--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const CreatePasskey = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.createPasskey`), name: 'Create Passkey', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemPasskey = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.redeemPasskey`), name: 'Redeem Passkey', icon: 'ph--key--regular' },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});

export const RedeemToken = Operation.make({
  meta: { key: DXN.make(`${CLIENT_OPERATION}.redeemToken`), name: 'Redeem Token', icon: 'ph--lock--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
});
