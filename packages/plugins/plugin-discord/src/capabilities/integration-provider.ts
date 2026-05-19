//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
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
import { DiscordApi } from '../services';
import { DiscordOperation } from '../types';

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
    description: 'Discord bot token from the application "Bot" page in the developer portal.',
  }),
});

const credentialForm: CredentialForm<Schema.Schema.Type<typeof DiscordTokenForm>> = {
  schema: DiscordTokenForm,
  defaultValues: { token: '' },
  onSubmit: ({ values, provider }) =>
    Effect.sync(() => {
      const accessToken = Obj.make(AccessToken.AccessToken, {
        source: DISCORD_SOURCE,
        token: values.token.trim(),
      });
      const integration = Obj.make(Integration.Integration, {
        name: provider.label ?? 'Discord',
        providerId: provider.id,
        accessToken: Ref.make(accessToken),
        targets: [],
      });
      return { kind: 'complete', accessToken, integration };
    }),
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
    const self = yield* DiscordApi.fetchSelf().pipe(
      Effect.provide(Layer.succeed(DiscordApi.DiscordCredentials, { token: accessToken.token })),
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
        credentialForm,
        getSyncTargets: DiscordOperation.GetDiscordChannels,
        sync: DiscordOperation.SyncDiscordChannel,
        onTokenCreated,
      },
    ]);
  }),
);
