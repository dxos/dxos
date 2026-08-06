//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { IdentityDid, SpaceId } from '@dxos/keys';

import { meta } from '#meta';

// TODO(wittjosiah): Factor out. Generate?
const IdentitySchema = Schema.Struct({
  identityDid: IdentityDid,
  spaceId: Schema.optional(SpaceId),
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

export class CreateIdentity extends Schema.TaggedClass<CreateIdentity>()(`${meta.profile.key}.action.create-identity`, {
  input: ProfileSchema,
  output: IdentitySchema,
}) {}

export class JoinIdentity extends Schema.TaggedClass<JoinIdentity>()(`${meta.profile.key}.action.join-identity`, {
  input: Schema.Struct({
    invitationCode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
}) {}

export class ShareIdentity extends Schema.TaggedClass<ShareIdentity>()(`${meta.profile.key}.action.share-identity`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class RecoverIdentity extends Schema.TaggedClass<RecoverIdentity>()(
  `${meta.profile.key}.action.recover-identity`,
  {
    input: Schema.Void,
    output: Schema.Void,
  },
) {}

export class ResetStorage extends Schema.TaggedClass<ResetStorage>()(`${meta.profile.key}.action.reset-storage`, {
  input: Schema.Struct({
    mode: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
}) {}

export class CreateAgent extends Schema.TaggedClass<CreateAgent>()(`${meta.profile.key}.action.create-agent`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class CreateRecoveryCode extends Schema.TaggedClass<CreateRecoveryCode>()(
  `${meta.profile.key}.action.create-recovery-code`,
  {
    input: Schema.Void,
    output: Schema.Void,
  },
) {}

export class CreatePasskey extends Schema.TaggedClass<CreatePasskey>()(`${meta.profile.key}.action.create-passkey`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class RedeemPasskey extends Schema.TaggedClass<RedeemPasskey>()(`${meta.profile.key}.action.redeem-passkey`, {
  input: Schema.Void,
  output: Schema.Void,
}) {}

export class RedeemToken extends Schema.TaggedClass<RedeemToken>()(`${meta.profile.key}.action.redeem-token`, {
  input: Schema.Struct({
    token: Schema.String,
  }),
  output: Schema.Void,
}) {}
