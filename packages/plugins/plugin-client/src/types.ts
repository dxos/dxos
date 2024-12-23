//
// Copyright 2024 DXOS.org
//

import {
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type Plugin,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { Client, PublicKey, type ClientOptions } from '@dxos/react-client';

import { CLIENT_PLUGIN } from './meta';

// TODO(wittjosiah): Factor out. Generate?
const IdentitySchema = S.Struct({
  identityKey: S.instanceOf(PublicKey),
  spaceKey: S.optional(S.instanceOf(PublicKey)),
  profile: S.optional(
    S.Struct({
      displayName: S.optional(S.String),
      avatarCid: S.optional(S.String),
      data: S.optional(S.Record({ key: S.String, value: S.Any })),
    }),
  ),
});

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export namespace ClientAction {
  export class CreateIdentity extends S.TaggedClass<CreateIdentity>()(`${CLIENT_ACTION}/create-identity`, {
    input: S.Struct({
      displayName: S.optional(S.String),
    }),
    output: IdentitySchema,
  }) {}

  export class JoinIdentity extends S.TaggedClass<JoinIdentity>()(`${CLIENT_ACTION}/join-identity`, {
    input: S.Struct({
      invitationCode: S.String,
    }),
    output: S.Void,
  }) {}

  export class ShareIdentity extends S.TaggedClass<ShareIdentity>()(`${CLIENT_ACTION}/share-identity`, {
    input: S.Void,
    output: S.Void,
  }) {}

  export class RecoverIdentity extends S.TaggedClass<RecoverIdentity>()(`${CLIENT_ACTION}/recover-identity`, {
    input: S.Void,
    output: S.Void,
  }) {}

  export class ResetStorage extends S.TaggedClass<ResetStorage>()(`${CLIENT_ACTION}/reset-storage`, {
    input: S.Struct({
      target: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class CreateAgent extends S.TaggedClass<CreateAgent>()(`${CLIENT_ACTION}/create-agent`, {
    input: S.Void,
    output: S.Void,
  }) {}

  export class CreateRecoveryCode extends S.TaggedClass<CreateRecoveryCode>()(`${CLIENT_ACTION}/create-recovery-code`, {
    input: S.Void,
    output: S.Void,
  }) {}
}

export type ClientPluginOptions = ClientOptions & {
  /**
   * Used to track app-specific state in spaces.
   */
  appKey: string;

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
  onClientInitialized?: (client: Client) => Promise<void>;

  /**
   * Run after the identity has been successfully initialized.
   * Run with client during plugin ready phase.
   */
  onReady?: (client: Client, plugins: Plugin[]) => Promise<void>;

  /**
   * Called when the client is reset.
   */
  onReset?: (params: { target?: string }) => Promise<void>;
};

export type ClientPluginProvides = IntentResolverProvides &
  GraphBuilderProvides &
  SurfaceProvides &
  TranslationsProvides & {
    client: Client;
  };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;
