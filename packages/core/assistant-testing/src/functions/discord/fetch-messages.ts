//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { Array, Effect, Layer, Option, pipe, Schema } from 'effect';

import { Obj } from '@dxos/echo';
import { CredentialsService, defineFunction, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import type { MessageResponse } from 'dfx/types';

const generateSnowflake = (unixTimestamp: number): bigint => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return (BigInt(unixTimestamp * 1000) - discordEpoch) << 22n;
};

const parseSnowflake = (snowflake: string): Date => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return new Date(Number((BigInt(snowflake) >> 22n) + discordEpoch));
};

const DEFAULT_AFTER = 1704067200; // 2024-01-01

const DiscordConfigFromCredential = Layer.unwrapEffect(
  Effect.gen(function* () {
    return DiscordConfig.layer({
      token: yield* CredentialsService.getApiKey({ service: 'discord.com' }),
    });
  }),
);

const makeMessage = (message: MessageResponse): DataType.Message =>
  Obj.make(DataType.Message, {
    [Obj.Meta]: {
      keys: [
        { id: message.id, source: 'discord.com' },
        { id: message.channel_id, source: 'discord.com/thread' },
      ],
    },
    sender: { name: message.author.username },
    created: message.timestamp,
    blocks: [{ _tag: 'text', text: message.content }],
  });

export default defineFunction({
  name: 'dxos.org/function/fetch-discord-messages',
  inputSchema: Schema.Struct({
    serverId: Schema.optional(Schema.String).annotations({
      description: 'The ID of the server to fetch messages from.',
    }),
    channelId: Schema.optional(Schema.String).annotations({
      description:
        'The ID of the channel to fetch messages from. Will crawl all channels from the server if not specified.',
    }),
    after: Schema.optional(Schema.Number).annotations({
      description: 'Unix timestamp in seconds.',
    }),
    pageSize: Schema.optional(Schema.Number).annotations({
      description: 'The number of messages to fetch per page.',
    }),
    limit: Schema.optional(Schema.Number).annotations({
      description: 'The maximum number of messages to fetch.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({ data: { serverId, channelId, after = DEFAULT_AFTER, pageSize = 100, limit = 500 } }) {
      const rest = yield* DiscordREST;

      let channelIds: string[] = [];
      if (channelId) {
        channelIds = [channelId];
      } else if (serverId) {
        const channels = yield* rest.listGuildChannels(serverId);
        const { threads } = yield* rest.getActiveGuildThreads(serverId);
        const allChannels = [...channels, ...threads];
        log('allChannels', {
          channels: allChannels.map((channel) => ({ id: channel.id, name: 'name' in channel && channel.name })),
        });
        channelIds = allChannels.map((channel) => channel.id);
      } else {
        throw new Error('serverId or channelId is required');
      }

      yield* TracingService.emitStatus({ message: `Will fetch from channels: ${channelIds.length}` });

      const allMessages: DataType.Message[] = [];
      for (const channelId of channelIds) {
        let lastMessage: Option.Option<DataType.Message> = Option.none();
        while (true) {
          const { id: lastId = undefined } = pipe(
            lastMessage,
            Option.map(Obj.getKeys('discord.com')),
            Option.flatMap(Option.fromIterable),
            Option.getOrElse(() => ({ id: undefined })),
          );

          const options = {
            after: !lastId ? `${generateSnowflake(after)}` : lastId,
            limit: pageSize,
          };
          log('fetching messages', {
            lastId,
            afterSnowflake: options.after,
            after: parseSnowflake(options.after),
            limit: options.limit,
          });
          const messages = yield* rest.listMessages(channelId, options).pipe(
            Effect.map(Array.map(makeMessage)),
            Effect.map(Array.reverse),
            Effect.catchTag('ErrorResponse', (err) =>
              err.cause.code === 50001 ? Effect.succeed([]) : Effect.fail(err),
            ),
          );
          if (messages.length > 0) {
            lastMessage = Option.fromNullable(messages.at(-1));
            allMessages.push(...messages);
          } else {
            break;
          }
          yield* TracingService.emitStatus({ message: `Fetched messages: ${allMessages.length}` });
          if (allMessages.length >= limit) {
            break;
          }
        }
        if (allMessages.length >= limit) {
          break;
        }
      }

      return allMessages;
    },
    Effect.provide(
      DiscordRESTMemoryLive.pipe(Layer.provideMerge(DiscordConfigFromCredential)).pipe(
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Effect.orDie,
  ),
});
