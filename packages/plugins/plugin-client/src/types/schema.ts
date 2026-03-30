//
// Copyright 2024 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Client, type ClientOptions, PublicKey } from '@dxos/client';

import { meta } from '../meta';

// TODO(wittjosiah): Factor out. Generate?
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

export namespace ClientAction {
  const ProfileSchema = Schema.Struct({
    displayName: Schema.optional(Schema.String),
    avatarCid: Schema.optional(Schema.String),
    data: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  });

  export class CreateIdentity extends Schema.TaggedClass<CreateIdentity>()(`${meta.id}.action.create-identity`, {
    input: ProfileSchema,
    output: IdentitySchema,
  }) {}

  export class JoinIdentity extends Schema.TaggedClass<JoinIdentity>()(`${meta.id}.action.join-identity`, {
    input: Schema.Struct({
      invitationCode: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class ShareIdentity extends Schema.TaggedClass<ShareIdentity>()(`${meta.id}.action.share-identity`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class RecoverIdentity extends Schema.TaggedClass<RecoverIdentity>()(`${meta.id}.action.recover-identity`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class ResetStorage extends Schema.TaggedClass<ResetStorage>()(`${meta.id}.action.reset-storage`, {
    input: Schema.Struct({
      mode: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class CreateAgent extends Schema.TaggedClass<CreateAgent>()(`${meta.id}.action.create-agent`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class CreateRecoveryCode extends Schema.TaggedClass<CreateRecoveryCode>()(
    `${meta.id}.action.create-recovery-code`,
    {
      input: Schema.Void,
      output: Schema.Void,
    },
  ) {}

  export class CreatePasskey extends Schema.TaggedClass<CreatePasskey>()(`${meta.id}.action.create-passkey`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class RedeemPasskey extends Schema.TaggedClass<RedeemPasskey>()(`${meta.id}.action.redeem-passkey`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class RedeemToken extends Schema.TaggedClass<RedeemToken>()(`${meta.id}.action.redeem-token`, {
    input: Schema.Struct({
      token: Schema.String,
    }),
    output: Schema.Void,
  }) {}
}

export type ClientPluginOptions = ClientOptions & {
  /**
   * Base origin for the invitation link.
   */
  shareableLinkOrigin?: string;

  /**
   * Path for the invitation link.
   */
  invitationPath?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationProp?: string;

  /**
   * Run after the client has been initialized.
   * Plugin context is provided so capabilities are accessible.
   */
  onClientInitialized?: (params: { client: Client }) => Effect.Effect<void, Error | never, Capability.Service | never>;

  /**
   * Called when spaces are ready.
   * Plugin context is provided so capabilities are accessible.
   */
  onSpacesReady?: (params: { client: Client }) => Effect.Effect<void, Error | never, Capability.Service | never>;

  /**
   * Called when the client is reset.
   * Plugin context is provided so capabilities are accessible.
   */
  onReset?: (params: { target?: string }) => Effect.Effect<void, Error | never, Capability.Service | never>;
};

export namespace Account {
  // TODO(wittjosiah): Cannot use slashes in ids until we have a router which decouples ids from url paths.
  const _id = 'dxos.org.plugin.client.account';
  // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
  //  Ideally this should be worked into the data model in a generic way.
  export const id = `!${_id}`;

  export const Profile = `${_id}.profile`;
  export const Devices = `${_id}.devices`;
  export const Security = `${_id}.security`;
}
