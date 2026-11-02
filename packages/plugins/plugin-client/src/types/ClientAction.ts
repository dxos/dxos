//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { IdentityDid, SpaceId } from '@dxos/keys';

import { ClientNamespace } from '../namespace.ts';

// TODO(wittjosiah): Factor out. Generate?
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

export class CreateIdentity extends Schema.TaggedClass<CreateIdentity>()(
  `${ClientNamespace.key}.action.create-identity`,
  {
    input: ProfileSchema,
    output: IdentitySchema,
  },
) {}

export class JoinIdentity extends Schema.TaggedClass<JoinIdentity>()(`${ClientNamespace.key}.action.join-identity`, {
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
}) {}

export class ShareIdentity extends Schema.TaggedClass<ShareIdentity>()(`${ClientNamespace.key}.action.share-identity`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class RecoverIdentity extends Schema.TaggedClass<RecoverIdentity>()(
  `${ClientNamespace.key}.action.recover-identity`,
  {
    input: Schema.Void,
    output: Schema.Void,
  },
) {}

export class ResetStorage extends Schema.TaggedClass<ResetStorage>()(`${ClientNamespace.key}.action.reset-storage`, {
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
}) {}

export class CreateAgent extends Schema.TaggedClass<CreateAgent>()(`${ClientNamespace.key}.action.create-agent`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class CreateRecoveryCode extends Schema.TaggedClass<CreateRecoveryCode>()(
  `${ClientNamespace.key}.action.create-recovery-code`,
  {
    input: Schema.Void,
    output: Schema.Void,
  },
) {}

export class CreatePasskey extends Schema.TaggedClass<CreatePasskey>()(`${ClientNamespace.key}.action.create-passkey`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class RedeemPasskey extends Schema.TaggedClass<RedeemPasskey>()(`${ClientNamespace.key}.action.redeem-passkey`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class RedeemToken extends Schema.TaggedClass<RedeemToken>()(`${ClientNamespace.key}.action.redeem-token`, {
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
}) {}
