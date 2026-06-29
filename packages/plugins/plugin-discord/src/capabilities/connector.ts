//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { type CredentialForm, type OnTokenCreated, Connection, Connector } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

import {
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
 * Manual-credential form for the Discord Bot connector.
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
 * coordinator persist the Connection.
 *
 * Doing this here (rather than waiting for first sync) means a wrong token —
 * pasted Application ID, expired token, regenerated token — fails the form
 * with a clear message instead of silently creating a Connection that 401s
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
  // Validates before the dialog closes so 401/format errors are shown inline.
  onValidate: ({ values }) =>
    Effect.gen(function* () {
      const token = values.token.trim();
      if (token.length === 0) {
        return yield* Effect.fail(new Error('Bot token is required.'));
      }
      yield* validateToken(token);
    }),
  onSubmit: ({ values, connector }) =>
    Effect.gen(function* () {
      // Trim defensively: onValidate is optional and callers bypass it in tests.
      const token = values.token.trim();
      const self = yield* validateToken(token);
      const account = self.global_name && self.global_name.length > 0 ? self.global_name : self.username;
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: DISCORD_SOURCE,
        account,
        token,
      });
      const connection = Connection.make({
        name: connector.label ?? DISCORD_BOT_LABEL,
        connectorId: connector.id,
        accessToken: Ref.make(accessToken),
      });
      return { kind: 'complete' as const, accessToken, connection };
    }).pipe(Effect.orDie),
};

/**
 * Factory for the token-created hook.
 *
 * Both the bot and user connectors call `GET /users/@me` to populate
 * `accessToken.account`; the only difference is which layer they use.
 * Failures are swallowed so a failed call cannot block an otherwise-valid
 * Connection.
 */
const makeOnTokenCreated =
  (makeLayer: (token: string) => Layer.Layer<DiscordREST>): OnTokenCreated =>
  ({ accessToken }) =>
    Effect.gen(function* () {
      if (accessToken.account) {
        return;
      }
      const self = yield* Effect.gen(function* () {
        const rest = yield* DiscordREST;
        return yield* rest.getMyUser();
      }).pipe(Effect.provide(makeLayer(accessToken.token)));
      Obj.update(accessToken, (accessToken) => {
        accessToken.account = self.global_name && self.global_name.length > 0 ? self.global_name : self.username;
      });
    }).pipe(Effect.orDie);

const onTokenCreated = makeOnTokenCreated(makeDiscordLayerFromToken);
const userOnTokenCreated = makeOnTokenCreated(makeDiscordUserLayerFromToken);

/**
 * Contributes two `Connector` entries for Discord:
 * - `discord` — bot token (manual credential form, syncs guild channels the bot was invited to)
 * - `discord-user` — OAuth user token (syncs guild channels the user is a member of)
 *
 * Both connectors share the same `GetDiscordChannels` discovery,
 * `materializeTarget` (empty feed-backed Channel per remote channel), and
 * `SyncDiscordChannel` sync operation. The auth difference is handled
 * transparently at the layer level: `makeDiscordUserLayerFromToken` rewrites
 * dfx's `Bot <token>` header to `Bearer <token>` inside the proxy fetch layer.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: DISCORD_PROVIDER_ID,
        source: DISCORD_SOURCE,
        label: DISCORD_BOT_LABEL,
        credentialForm,
        optionsSchema: DiscordTargetOptions,
        getSyncTargets: DiscordOperation.GetDiscordChannels,
        materializeTarget: DiscordOperation.MaterializeDiscordTarget,
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
        getSyncTargets: DiscordOperation.GetDiscordChannels,
        materializeTarget: DiscordOperation.MaterializeDiscordTarget,
        sync: DiscordOperation.SyncDiscordChannel,
        onTokenCreated: userOnTokenCreated,
      },
    ]);
  }),
);
