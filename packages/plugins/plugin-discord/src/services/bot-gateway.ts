//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Context } from '@dxos/context';
import { type EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';

import { DiscordChannel } from '#types';

import { DiscordChannelError } from '../errors.ts';

/** EDGE route of the gateway host for one bot, keyed by its Discord application id. */
export const discordBotPath = (applicationId: string) => `/compute/discord/bots/${encodeURIComponent(applicationId)}`;

/** Calls a bot route and decodes the `DiscordBotStatus` EDGE answers every verb with. */
export const callBot: (
  edge: EdgeHttpClient,
  applicationId: string,
  args: EdgeRequestArgs,
) => Effect.Effect<DiscordChannel.BotStatus, DiscordChannelError> = Effect.fnUntraced(
  function* (edge, applicationId, args) {
    const data = yield* Effect.tryPromise({
      try: () => edge.request(Context.default(), discordBotPath(applicationId), args),
      catch: (cause) => new DiscordChannelError({ message: 'EDGE Discord bot request failed.', cause }),
    });
    return yield* Schema.decodeUnknownEffect(DiscordChannel.BotStatus)(data).pipe(
      Effect.mapError(
        (cause) => new DiscordChannelError({ message: 'Unexpected Discord bot status from EDGE.', cause }),
      ),
    );
  },
);

/**
 * The bot status as a backend-neutral connection status. EDGE keys a bot by application id, so a
 * config saved but never started still reads the bot another config started: that is reported as
 * {@link DiscordChannel.OTHER_CONFIG_STATE}.
 */
export const toConnectionStatus = (
  status: DiscordChannel.BotStatus,
  configId: string,
): ThreadOperation.ConnectionStatus => {
  const configuredId = status.config?.binding?.split('/').at(-1);
  return {
    running: status.running,
    state: configuredId && configuredId !== configId ? DiscordChannel.OTHER_CONFIG_STATE : status.gateway,
    detail: `${status.threads} ${status.threads === 1 ? 'thread' : 'threads'}`,
    error: status.lastError,
  };
};
