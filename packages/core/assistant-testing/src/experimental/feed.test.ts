//
// Copyright 2025 DXOS.org
//

import { AiToolkit } from '@effect/ai';
import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Config, Effect, Layer, Redacted } from 'effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import {
  ComputeEventLogger,
  CredentialsService,
  FunctionImplementationResolver,
  FunctionInvocationService,
  LocalFunctionExecutionService,
  RemoteFunctionExecutionService,
  TracingService,
} from '@dxos/functions';
import { TestDatabaseLayer, testStoragePath } from '@dxos/functions/testing';

import { syncLinearIssues } from '../functions';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], AiToolkit.make()),
  makeToolExecutionServiceFromFunctions(AiToolkit.make() as any, Layer.empty as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        indexing: { vector: true },
        types: [],
        storagePath: testStoragePath({ name: 'feed-test' }),
      }),
      CredentialsService.layerConfig([
        { service: 'exa.ai', apiKey: Config.succeed(Redacted.make(EXA_API_KEY)) },
        { service: 'discord.com', apiKey: Config.redacted('DISCORD_TOKEN') },
        { service: 'linear.app', apiKey: Config.redacted('LINEAR_API_KEY') },
      ]),
      LocalFunctionExecutionService.layer,
      RemoteFunctionExecutionService.layerMock,
      TracingService.layerLogInfo(),
      FetchHttpClient.layer,
      FunctionInvocationService.layerTest,
      FunctionImplementationResolver.layerTest({ functions: [] }),
    ),
  ),
);

describe('Feed', { timeout: 600_000 }, () => {
  it.effect(
    'fetch discord messages',
    Effect.fnUntraced(
      function* ({ expect: _ }) {
        // const messages = yield* LocalFunctionExecutionService.invokeFunction(fetchDiscordMessages, {
        //   serverId: '837138313172353095',
        //   // channelId: '1404487604761526423',
        //   after: Date.now() / 1000 - 128 * 3600,
        // });
        // for (const message of messages) {
        //   console.log(message.sender.name, message.blocks.find((block) => block._tag === 'text')?.text);
        // }
        // console.log(`Fetched ${messages.length} messages`);

        // const result = yield* AiSession.run({
        //   history: [
        //     Obj.make(DataType.Message, {
        //       created: new Date().toISOString(),
        //       sender: { role: 'user' },
        //       blocks: messages
        //         .map(
        //           (message) =>
        //             ({
        //               _tag: 'text',
        //               text: message.sender.name + ': ' + message.blocks.find((block) => block._tag === 'text')?.text,
        //             }) as const,
        //         )
        //         .filter((block) => block._tag === 'text' && block.text.trim().length > 0),
        //     }),
        //   ],
        //   prompt: 'Summarize the messages.',
        //   system: 'Summarize the messages.',
        // }).pipe(Effect.provide(AiService.model('@anthropic/claude-3-5-haiku-latest')));
        // console.log(result);

        const linearIssues = yield* LocalFunctionExecutionService.invokeFunction(syncLinearIssues, {
          team: '1127c63a-6f77-4725-9229-50f6cd47321c',
        });
        console.log(linearIssues);

        // const result = yield* AiSession.run({
        //   history: [
        //     Obj.make(DataType.Message, {
        //       created: new Date().toISOString(),
        //       sender: { role: 'user' },
        //       blocks: [{ _tag: 'text', text: JSON.stringify(linearIssues) }],
        //     }),
        //   ],
        //   prompt: 'Summarize the whats new.',
        //   system: 'Summarize the whats new. Reference specific people by name.',
        // }).pipe(Effect.provide(AiService.model('@anthropic/claude-sonnet-4-0')));
        // console.log(result.at(-1)?.blocks.find((block) => block._tag === 'text')?.text);
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
