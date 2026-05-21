//
// Copyright 2026 DXOS.org
//

import { DiscordREST } from 'dfx';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { IntegrationProvider as IntegrationProviderCapability, type OnTokenCreated } from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';

import { DISCORD_OAUTH_SCOPES, DISCORD_PROVIDER_ID, DISCORD_SOURCE } from '../constants';
import { discordErrorStatus, formatDiscordSyncFailure, isDiscordErrorResponse } from '../errors';
import { makeDiscordLayerFromToken } from '../services';
import { DiscordOperation, DiscordTargetOptions } from '../types';

/**
 * Service-specific token-created hook for Discord.
 *
 * Calls `GET /users/@me` to populate `accessToken.account` with the
 * user's display name (preferring `global_name`, falling back to `username`).
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
    }).pipe(
      Effect.provide(makeDiscordLayerFromToken(accessToken.token)),
      Effect.mapError((error) => {
        if (isDiscordErrorResponse(error) && discordErrorStatus(error) === 401) {
          return new Error('Discord rejected the token (401). Re-authorize to get a fresh token.');
        }
        return error instanceof Error ? error : new Error(formatDiscordSyncFailure(error));
      }),
    );
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
        oauth: {
          provider: OAuthProvider.DISCORD,
          scopes: DISCORD_OAUTH_SCOPES,
        },
        optionsSchema: DiscordTargetOptions,
        getSyncTargets: DiscordOperation.GetDiscordChannels,
        sync: DiscordOperation.SyncDiscordChannel,
        onTokenCreated,
      },
    ]);
  }),
);
