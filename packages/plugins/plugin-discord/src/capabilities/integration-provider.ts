//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import {
  type CredentialForm,
  Integration,
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration';
import { AccessToken } from '@dxos/types';

import { DISCORD_PROVIDER_ID, DISCORD_SOURCE } from '../constants';
import { discordErrorStatus, isDiscordErrorResponse } from '../errors';
import { makeDiscordLayerFromToken } from '../services';
import { DiscordOperation, DiscordTargetOptions } from '../types';

/**
 * Manual-credential form. Discord doesn't have an `OAuthProvider` enum entry
 * yet (Edge has no Discord support), so we collect the bot token directly.
 * The user follows Discord's developer portal flow to create an application,
 * grab the bot token, and invite the bot to a guild — that side of the flow
 * stays outside this plugin; `generateInviteUrl` in `constants.ts` is the
 * helper the rest of the codebase can use to surface the invite link.
 */
const DiscordTokenForm = Schema.Struct({
  token: Schema.String.annotations({
    title: 'Bot Token',
    description:
      'Bot token from your application\'s "Bot" page in the Discord developer portal. ' +
      'NOT the Application ID, Public Key, or OAuth2 Client Secret.',
  }),
});

/**
 * Validate the pasted token against `GET /users/@me` before letting the
 * coordinator persist the Integration.
 *
 * Doing this here (rather than waiting for first sync) means a wrong token —
 * pasted Application ID, expired token, regenerated token — fails the form
 * with a clear message instead of silently creating an Integration that 401s
 * on every later operation. As a bonus we already have the bot's identity,
 * so we populate `accessToken.account` inline and skip the `onTokenCreated`
 * round-trip.
 */
const validateToken = (token: string) =>
  Effect.gen(function* () {
    const rest = yield* DiscordREST;
    return yield* rest.getMyUser();
  }).pipe(
    Effect.provide(makeDiscordLayerFromToken(token)),
    Effect.mapError((error) => {
      if (isDiscordErrorResponse(error) && discordErrorStatus(error) === 401) {
        return new Error(
          'Discord rejected the token (401). Reset the bot token in the developer portal and paste it again.',
        );
      }
      return error instanceof Error ? error : new Error(String(error));
    }),
  );

const credentialForm: CredentialForm<Schema.Schema.Type<typeof DiscordTokenForm>> = {
  schema: DiscordTokenForm,
  defaultValues: { token: '' },
  onSubmit: ({ values, provider }) =>
    Effect.gen(function* () {
      const token = values.token.trim();
      if (token.length === 0) {
        return yield* Effect.fail(new Error('Bot token is required.'));
      }
      const self = yield* validateToken(token);
      const account = self.global_name && self.global_name.length > 0 ? self.global_name : self.username;
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: DISCORD_SOURCE,
        account,
        token,
      });
      const integration = Obj.make(Integration.Integration, {
        name: provider.label ?? 'Discord',
        providerId: provider.id,
        accessToken: Ref.make(accessToken),
        targets: [],
      });
      return { kind: 'complete' as const, accessToken, integration };
    }).pipe(Effect.orDie),
};

/**
 * Service-specific token-created hook for Discord.
 *
 * Calls `GET /users/@me` to populate `accessToken.account` with the bot's
 * display name (preferring `global_name`, falling back to `username`).
 * Failures are elevated with {@link Effect.orDie}; plugin-integration logs
 * defects from the runner and continues so a failed `/users/@me` cannot
 * block the Integration already created.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const self = yield* Effect.gen(function* () {
      const rest = yield* DiscordREST;
      return yield* rest.getMyUser();
    }).pipe(Effect.provide(makeDiscordLayerFromToken(accessToken.token)));
    Obj.update(accessToken, (accessToken) => {
      const display = self.global_name && self.global_name.length > 0 ? self.global_name : self.username;
      accessToken.account = display;
    });
  }).pipe(Effect.orDie);

/**
 * Contributes a single `IntegrationProvider` entry that wires Discord's two
 * operations and the token-created hook to the `'discord.com'` source.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: DISCORD_PROVIDER_ID,
        source: DISCORD_SOURCE,
        label: 'Discord',
        credentialForm,
        optionsSchema: DiscordTargetOptions,
        getSyncTargets: DiscordOperation.GetDiscordChannels,
        sync: DiscordOperation.SyncDiscordChannel,
        onTokenCreated,
      },
    ]);
  }),
);
