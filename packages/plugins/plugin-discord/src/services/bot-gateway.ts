//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Context } from '@dxos/context';
import { type EdgeHttpClient, type EdgeRequestArgs } from '@dxos/edge-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';

import { DiscordChannel } from '#types';

import { type DiscordBotAccessError, DiscordChannelError, toBotRequestError } from '../errors.ts';

/** Resolves the EDGE client that signs bot-route requests with the user's identity. */
export type EdgeClientResolver = Effect.Effect<EdgeHttpClient, DiscordChannelError, Capability.Service>;

/** The app's client; absent on EDGE itself, where the gateway routes are not called. */
export const appEdgeClient: EdgeClientResolver = Effect.gen(function* () {
  const [client] = yield* Capability.getAll(ClientCapabilities.Client);
  if (!client) {
    return yield* Effect.fail(
      new DiscordChannelError({ message: 'Reaching the Discord bot needs the app client, which this host lacks.' }),
    );
  }
  return client.edge.http;
});

/** EDGE route of the gateway host for one bot, keyed by its Discord application id. */
export const discordBotPath = (applicationId: string) => `/discord/bots/${encodeURIComponent(applicationId)}`;

/** Calls a bot route and decodes the `DiscordBotStatus` EDGE answers every verb with. */
export const callBot: (
  edge: EdgeHttpClient,
  applicationId: string,
  args: EdgeRequestArgs,
) => Effect.Effect<DiscordChannel.BotStatus, DiscordChannelError | DiscordBotAccessError> = Effect.fnUntraced(
  function* (edge, applicationId, args) {
    const data = yield* Effect.tryPromise({
      try: () => edge.request(Context.default(), discordBotPath(applicationId), args),
      catch: toBotRequestError,
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

/** Calls a bot route under {@link discordBotPath} and decodes the `data` EDGE answers with. */
export const callBotRoute = <A, I>(
  edge: EdgeHttpClient,
  applicationId: string,
  route: string,
  args: EdgeRequestArgs,
  schema: Schema.Codec<A, I>,
): Effect.Effect<A, DiscordChannelError | DiscordBotAccessError> =>
  Effect.gen(function* () {
    const data = yield* Effect.tryPromise({
      try: () => edge.request(Context.default(), `${discordBotPath(applicationId)}${route}`, args),
      catch: toBotRequestError,
    });
    return yield* Schema.decodeUnknownEffect(schema)(data).pipe(
      Effect.mapError((cause) => new DiscordChannelError({ message: `Unexpected answer from ${route}.`, cause })),
    );
  });
