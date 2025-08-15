//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient, HttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Array, Config, Effect, flow, Layer, Option, pipe, Predicate, Redacted, Ref } from 'effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  LocalFunctionExecutionService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { DataType } from '@dxos/schema';
import { AiToolkit } from '@effect/ai';
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import { threadId } from 'worker_threads';

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
    const { apiKey } = yield* CredentialsService.getCredential({ service: 'discord.com' });
    return DiscordConfig.layerConfig({
      token: Config.succeed(Redacted.make(apiKey!)),
    });
  }),
);

const fetchDiscord: (params: {
  serverId?: string;
  channelId?: string;
  after?: number;
  pageSize?: number;
  limit?: number;
}) => Effect.Effect<DataType.Message[], never, CredentialsService | HttpClient.HttpClient | TracingService> = Effect.fn(
  'fetchDiscord',
)(
  function* ({ serverId, channelId, after = DEFAULT_AFTER, pageSize = 100, limit = 500 }) {
    const rest = yield* DiscordREST;

    let channels: string[] = [];
    if (channelId) {
      channels = [channelId];
    } else if (serverId) {
      const channelObjs = yield* rest.listGuildChannels(serverId);
      const { threads } = yield* rest.getActiveGuildThreads(serverId);
      channels = [...channelObjs.map((channel) => channel.id), ...threads.map((thread) => thread.id)];
    } else {
      throw new Error('serverId or channelId is required');
    }

    yield* TracingService.emitStatus({ message: `Will fetch from channels: ${channels.length}` });

    let lastMessage: Option.Option<DataType.Message> = Option.none();

    const allMessages: DataType.Message[] = [];
    for (const channelId of channels) {
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
        console.log({
          lastId,
          afterSnowflake: options.after,
          after: parseSnowflake(options.after),
          limit: options.limit,
        });
        const messages = yield* rest.listMessages(channelId, options).pipe(
          Effect.map(
            Array.map((message) =>
              Obj.make(DataType.Message, {
                [Obj.Meta]: {
                  keys: [
                    { id: message.id, source: 'discord.com' },
                    { id: channelId, source: 'discord.com/thread' },
                  ],
                },
                sender: { name: message.author.username },
                created: message.timestamp,
                blocks: [{ _tag: 'text', text: message.content }],
              }),
            ),
          ),
          Effect.map(Array.reverse),
          Effect.catchTag('ErrorResponse', (err) => (err.cause.code === 50001 ? Effect.succeed([]) : Effect.fail(err))),
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
  Effect.provide(DiscordRESTMemoryLive.pipe(Layer.provideMerge(DiscordConfigFromCredential))),
  Effect.orDie,
);

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], AiToolkit.make()),
  makeToolExecutionServiceFromFunctions([], AiToolkit.make() as any, Layer.empty as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        indexing: { vector: true },
        types: [],
      }),
      CredentialsService.configuredLayer([
        { service: 'exa.ai', apiKey: EXA_API_KEY },
        { service: 'discord.com', apiKey: Redacted.value(Effect.runSync(Config.redacted('DISCORD_TOKEN'))) },
      ]),
      LocalFunctionExecutionService.layer,
      RemoteFunctionExecutionService.mockLayer,
      TracingService.layerLogInfo(),
      FetchHttpClient.layer,
    ),
  ),
);

describe('Feed', { timeout: 600_000 }, () => {
  it.effect(
    'fetch discord messages',
    Effect.fnUntraced(
      function* ({ expect: _ }) {
        const messages = yield* fetchDiscord({
          serverId: '837138313172353095',
          // channelId: '1404487604761526423',
          after: Date.now() / 1000 - 128 * 3600,
        });
        for (const message of messages) {
          console.log(message.sender.name, message.blocks.find((block) => block._tag === 'text')?.text);
        }
        console.log(`Fetched ${messages.length} messages`);
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
