//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
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
import { OAuthProvider } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import {
  DISCORD_API_BASE,
  DISCORD_BOT_LABEL,
  DISCORD_PROVIDER_ID,
  DISCORD_SOURCE,
  DISCORD_USER_LABEL,
  DISCORD_USER_PROVIDER_ID,
} from '../constants';
import { discordErrorStatus, formatDiscordSyncFailure, isDiscordErrorResponse } from '../errors';
import { makeDiscordLayerFromToken, makeDiscordUserLayerFromToken } from '../services';
import { DiscordOperation, DiscordTargetOptions } from '../types';

/**
 * Manual-credential form for the Discord Bot provider.
 *
 * Collects a bot token directly because bot auth is outside the normal OAuth
 * flow — the user creates an application in the Discord developer portal,
 * grabs the bot token, and invites the bot to their guild. `generateInviteUrl`
 * in `constants.ts` surfaces the invite link.
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
      // Preserve Discord's code/message for 403/404/5xx etc. via formatDiscordSyncFailure
      // — `String(error)` would collapse a dfx tagged error to its `_tag` string.
      return error instanceof Error ? error : new Error(formatDiscordSyncFailure(error));
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
        name: provider.label ?? DISCORD_BOT_LABEL,
        providerId: provider.id,
        accessToken: Ref.make(accessToken),
        targets: [],
      });
      return { kind: 'complete' as const, accessToken, integration };
    }).pipe(Effect.orDie),
};

/**
 * Token-created hook for the Discord Bot provider.
 *
 * Calls `GET /users/@me` via dfx (Bot auth) to populate `accessToken.account`
 * with the bot's display name. Failures are swallowed so a failed call cannot
 * block an Integration that is otherwise valid.
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
      accessToken.account = self.global_name && self.global_name.length > 0 ? self.global_name : self.username;
    });
  }).pipe(Effect.orDie);

/** Minimal wire shape for `GET /users/@me` used by `userOnTokenCreated`. */
const DiscordUserMeResponse = Schema.Struct({
  username: Schema.String,
  global_name: Schema.NullOr(Schema.String).pipe(Schema.optional),
});

/**
 * Token-created hook for the Discord User OAuth provider.
 *
 * Calls `GET /users/@me` with `Bearer` auth (user OAuth token) to populate
 * `accessToken.account`. Falls back to a no-op on failure so a transient
 * network error does not break the newly created Integration.
 */
const userOnTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const self = yield* Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      return yield* HttpClientRequest.get(`${DISCORD_API_BASE}/users/@me`).pipe(
        httpClient.execute,
        Effect.flatMap((res) => res.json),
        Effect.flatMap(Schema.decodeUnknown(DiscordUserMeResponse)),
        Effect.scoped,
      );
    }).pipe(
      Effect.provide(makeDiscordUserLayerFromToken(accessToken.token)),
      Effect.orElseSucceed(() => null),
    );
    if (self) {
      Obj.update(accessToken, (accessToken) => {
        accessToken.account = self.global_name && self.global_name.length > 0 ? self.global_name : self.username;
      });
    }
  }).pipe(Effect.orDie);

/**
 * Contributes two `IntegrationProvider` entries for Discord:
 * - `discord` — bot token (manual credential form, syncs guild channels the bot was invited to)
 * - `discord-user` — OAuth user token (syncs guild channels the user is a member of)
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: DISCORD_PROVIDER_ID,
        source: DISCORD_SOURCE,
        label: DISCORD_BOT_LABEL,
        credentialForm,
        optionsSchema: DiscordTargetOptions,
        getSyncTargets: DiscordOperation.GetDiscordChannels,
        sync: DiscordOperation.SyncDiscordChannel,
        onTokenCreated,
      },
      {
        id: DISCORD_USER_PROVIDER_ID,
        source: DISCORD_SOURCE,
        label: DISCORD_USER_LABEL,
        oauth: {
          provider: OAuthProvider.DISCORD,
          scopes: ['identify', 'guilds'],
        },
        optionsSchema: DiscordTargetOptions,
        getSyncTargets: DiscordOperation.GetDiscordUserChannels,
        sync: DiscordOperation.SyncDiscordChannel,
        onTokenCreated: userOnTokenCreated,
      },
    ]);
  }),
);
