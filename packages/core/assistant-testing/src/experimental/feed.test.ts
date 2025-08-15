//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Config, Effect, Layer, Redacted, Ref } from 'effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  LocalFunctionExecutionService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';
import { AiToolkit } from '@effect/ai';
import { DiscordConfig, DiscordREST, DiscordRESTMemoryLive } from 'dfx';
import { DataType } from '@dxos/schema';
import { FetchHttpClient } from '@effect/platform';
import { Obj } from '@dxos/echo';

const generateSnowflake = (unixTimestamp: number): bigint => {
  const discordEpoch = 1420070400000n; // Discord Epoch (ms)
  return (BigInt(unixTimestamp * 1000) - discordEpoch) << 22n;
};

const DEFAULT_AFTER = 1704067200; // 2024-01-01

const fetchDiscord: (params: {
  channelId: string;
  after?: number;
  pageSize?: number;
}) => Effect.Effect<DataType.Message[], never> = Effect.fn('fetchDiscord')(function* ({
  channelId,
  after = DEFAULT_AFTER,
  pageSize = 5,
}) {
  const { apiKey } = yield* CredentialsService.getCredential({ service: 'discord.com' });
  const newMessages = yield* Ref.make(0);
  const lastMessage = yield* Ref.make(undefined);
  const backfill = true;

  const enqueueMessages = Effect.gen(function* () {
    const rest = yield* DiscordREST;

    while (true) {
      const last = yield* Ref.get(lastMessage);
      const options = {
        after: backfill && !last ? `${generateSnowflake(after)}` : last?.foreignId,
        limit: pageSize,
      };
      const messages = yield* rest.getChannelMessages(channelId, options).pipe((res) => res.json());
      const queueMessages = messages
        .map((message: any) =>
          Obj.make(DataType.Message, {
            [Obj.Meta]: {
              keys: [{ id: message.id, source: 'discord.com' }],
            },
            sender: { name: message.author.username },
            created: message.timestamp,

            content: message.content,
          }),
        )
        .toReversed();
      if (queueMessages.length > 0) {
        yield* Ref.update(newMessages, (n: any) => n + queueMessages.length);
        yield* Ref.update(lastMessage, (m: any) => queueMessages.at(-1));
      }
      if (messages.length < pageSize) {
        break;
      }
    }
  }).pipe(
    Effect.provide(
      DiscordRESTMemoryLive.pipe(
        Layer.provideMerge(
          DiscordConfig.layerConfig({
            token: Config.succeed(Redacted.make(apiKey!)),
          }),
        ),
        Layer.provideMerge(FetchHttpClient.layer),
      ),
    ),
  );

  yield* enqueueMessages;
  return { newMessages: yield* Ref.get(newMessages) };
});

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
      CredentialsService.configuredLayer([{ service: 'exa.ai', apiKey: EXA_API_KEY }]),
      LocalFunctionExecutionService.layer,
      RemoteFunctionExecutionService.mockLayer,
      TracingService.layerNoop,
    ),
  ),
);

describe('Research', { timeout: 600_000 }, () => {
  it.effect(
    'call a function to generate a research report',
    Effect.fnUntraced(function* ({ expect: _ }) {}, Effect.provide(TestLayer), TestHelpers.taggedTest('llm')),
  );
});
