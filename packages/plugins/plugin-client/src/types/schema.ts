//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type PluginContext } from '@dxos/app-framework';
import { type Client, type ClientOptions, PublicKey } from '@dxos/react-client';
import { type MaybePromise } from '@dxos/util';

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

  export class CreateIdentity extends Schema.TaggedClass<CreateIdentity>()(`${meta.id}/action/create-identity`, {
    input: ProfileSchema,
    output: IdentitySchema,
  }) {}

  export class JoinIdentity extends Schema.TaggedClass<JoinIdentity>()(`${meta.id}/action/join-identity`, {
    input: Schema.Struct({
      invitationCode: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class ShareIdentity extends Schema.TaggedClass<ShareIdentity>()(`${meta.id}/action/share-identity`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class RecoverIdentity extends Schema.TaggedClass<RecoverIdentity>()(`${meta.id}/action/recover-identity`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class ResetStorage extends Schema.TaggedClass<ResetStorage>()(`${meta.id}/action/reset-storage`, {
    input: Schema.Struct({
      mode: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class CreateAgent extends Schema.TaggedClass<CreateAgent>()(`${meta.id}/action/create-agent`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class CreateRecoveryCode extends Schema.TaggedClass<CreateRecoveryCode>()(
    `${meta.id}/action/create-recovery-code`,
    {
      input: Schema.Void,
      output: Schema.Void,
    },
  ) {}

  export class CreatePasskey extends Schema.TaggedClass<CreatePasskey>()(`${meta.id}/action/create-passkey`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class RedeemPasskey extends Schema.TaggedClass<RedeemPasskey>()(`${meta.id}/action/redeem-passkey`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class RedeemToken extends Schema.TaggedClass<RedeemToken>()(`${meta.id}/action/redeem-token`, {
    input: Schema.Struct({
      token: Schema.String,
    }),
    output: Schema.Void,
  }) {}
}

export type ClientPluginOptions = ClientOptions & {
  /**
   * Base URL for the invitation link.
   */
  invitationUrl?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationParam?: string;

  /**
   * Run after the client has been initialized.
   */
  onClientInitialized?: (params: { context: PluginContext; client: Client }) => MaybePromise<void>;

  /**
   * Called when spaces are ready.
   */
  onSpacesReady?: (params: { context: PluginContext; client: Client }) => MaybePromise<void>;

  /**
   * Called when the client is reset.
   */
  onReset?: (params: { target?: string }) => MaybePromise<void>;
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
