//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import type {
  GuildChannelResponse,
  MessageResponse,
  PrivateChannelResponse,
  PrivateGroupChannelResponse,
  ThreadResponse,
} from 'dfx/types';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { CredentialsService, TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

// TODO(dmaretskyi): Extract.
const TimeRange = class extends Schema.String.pipe(Schema.pattern(/\d+(s|m|h|d)/)).annotations({
  description: 'Time range. 1d - 1 day, 2h - 2 hours, 30m - 30 minutes, 15s - 15 seconds.',
  examples: ['1d', '2h', '30m', '15s'],
}) {
  static toSeconds(timeRange: Schema.Schema.Type<typeof TimeRange>) {
    const match = timeRange.match(/(\d+)(s|m|h|d)/);
    if (!match) {
      throw new Error(`Invalid time range: ${timeRange}`);
    }
    const [_, amount, unit] = match;
    switch (unit) {
      case 's':
        return Number(amount);
      case 'm':
        return Number(amount) * 60;
      case 'h':
        return Number(amount) * 60 * 60;
      case 'd':
        return Number(amount) * 24 * 60 * 60;
      default:
        throw new Error(`Invalid time range unit: ${unit}`);
    }
  }
};
type TimeRange = Schema.Schema.Type<typeof TimeRange>;

const DiscordConfigFromCredential = Layer.unwrapEffect(
  Effect.gen(function* () {
    return DiscordConfig.layer({
      token: yield* CredentialsService.getApiKey({ service: 'discord.com' }),
      rest: {
        baseUrl: 'https://api-proxy.dxos.workers.dev/discord.com/api/v10',
      },
    });
  }),
);

type DiscordChannel = GuildChannelResponse | PrivateChannelResponse | PrivateGroupChannelResponse | ThreadResponse;

const DEFAULT_AFTER = 1704067200; // 2024-01-01
const DEFAULT_LIMIT = 500;
const DEFAULT_IGNORE_USERNAMES = ['GitHub', 'Needle'];

// TODO(dmaretskyi): Align with standard thread type.
type Thread = {
  discordChannelId: string;
  name?: string;
  messages: Message.Message[];
};

export default defineFunction({
  key: 'dxos.org/function/fetch-discord-messages',
  name: 'Sync Discord messages',
  inputSchema: Schema.Struct({
    serverId: Schema.String.annotations({
      description: 'The ID of the server to fetch messages from.',
    }),
    channelId: Schema.optional(Schema.String).annotations({
      description:
        'The ID of the channel to fetch messages from. Will crawl all channels from the server if not specified.',
    }),
    after: Schema.optional(Schema.Number).annotations({
      description:
        'Fetch messages that were sent after a given date. Unix timestamp in seconds. Exclusive with `last`.',
    }),
    last: TimeRange.annotations({
      description:
        'Time range to fetch most recent messages. Specifies the range in the past, from now. "1d" would fetch messages from the last 24 hours.',
    }),
    limit: Schema.optional(Schema.Number).annotations({
      description: 'The maximum number of messages to fetch.',
    }),
    pageSize: Schema.optional(Schema.Number).annotations({
      description: 'The number of messages to fetch per page.',
    }),
    ignoreUsernames: Schema.optional(Schema.Array(Schema.String)).annotations({
      description: 'Exclude messages from these usernames.',
    }),
  }),
  handler: Effect.fnUntraced(
    function* ({
      data: {
        serverId,
        channelId,
        after,
        last,
        pageSize = 100,
        limit = DEFAULT_LIMIT,
        ignoreUsernames = DEFAULT_IGNORE_USERNAMES,
      },
    }) {
      if (!after && !last) {
        throw new Error('cannot specify both `after` and `last`');
      }
      const afterTs = last ? Date.now() / 1000 - TimeRange.toSeconds(last) : (after ?? DEFAULT_AFTER);

      const rest = yield* DiscordREST;

      let channels: DiscordChannel[] = [];
      channels.push(...(yield* rest.listGuildChannels(serverId)));
      const { threads: guildThreads } = yield* rest.getActiveGuildThreads(serverId);
      channels.push(...guildThreads);
      if (channelId) {
        channels = channels.filter((channel) => channel.id === channelId);
      }
      if (channels.length === 0) {
        throw new Error('no channels found');
      }
      for (const channel of channels) {
        console.log(channel.id, 'name' in channel ? channel.name : undefined);
      }

      yield* TracingService.emitStatus({ message: `Will fetch from channels: ${channels.length}` });

      const threads = yield* Effect.forEach(
        channels,
        Effect.fnUntraced(function* (channel) {
          const allMessages: Message.Message[] = [];

          let lastMessage: Option.Option<Message.Message> = Option.none();
          while (true) {
            const { id: lastId = undefined } = Function.pipe(
              lastMessage,
              Option.map(Obj.getKeys('discord.com')),
              Option.flatMap(Option.fromIterable),
              Option.getOrElse(() => ({ id: undefined })),
            );

            const options = {
              after: !lastId ? `${generateSnowflake(afterTs)}` : lastId,
              limit: pageSize,
            };
            log.info('fetching messages', {
              lastId,
              afterTs,
              afterSnowflake: options.after,
              after: parseSnowflake(options.after),
              limit: options.limit,
            });
            const messages = yield* rest.listMessages(channel.id, options).pipe(
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

          return {
            discordChannelId: channel.id,
            name: 'name' in channel ? (channel.name ?? undefined) : undefined,
            messages: allMessages
              .filter((message) => !message.sender.name || !ignoreUsernames.includes(message.sender.name))
              .filter((message) =>
                message.blocks.some((block: any) => block._tag === 'text' && block.text.trim().length > 0),
              ),
          } satisfies Thread;
        }),
        { concurrency: 10 },
      );

      return threads
        .filter((thread) => thread.messages.length > 0)
        .map(serializeThread)
        .join('\n');
    },
    Effect.provide(
      DiscordRESTMemoryLive.pipe(Layer.provideMerge(DiscordConfigFromCredential)).pipe(
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Effect.orDie,
  ),
});

/**
 * @param unixTimestamp in seconds
 */
const generateSnowflake = (unixTimestamp: number): bigint => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return (BigInt(unixTimestamp * 1000) - discordEpoch) << 22n;
};

const parseSnowflake = (snowflake: string): Date => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return new Date(Number((BigInt(snowflake) >> 22n) + discordEpoch));
};

// TODO(burdon): Move to @dxos/types.
const makeMessage = (message: MessageResponse): Message.Message =>
  Obj.make(Message.Message, {
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

/**
 * Standard JSON serialization is to verbose for large amounts of data.
 */
const serializeThread = (thread: Thread): string => {
  return `<thread id=${thread.discordChannelId} name=${thread.name ?? ''}>\n${thread.messages
    .map(
      (message) =>
        `  ${message.sender.name}: ${message.blocks
          .filter((block: any) => block._tag === 'text')
          .map((block: any) => block.text)
          .join(' ')}`,
    )
    .join('\n')}\n</thread>`;
};
