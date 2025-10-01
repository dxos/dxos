//
// Copyright 2025 DXOS.org
//

import { Toolkit } from '@effect/ai';
import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Config, Effect, Layer } from 'effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import { ComputeEventLogger, CredentialsService, FunctionInvocationService, TracingService } from '@dxos/functions';
import { TestDatabaseLayer } from '@dxos/functions/testing';

import { default as fetchDiscordMessages } from './fetch-messages';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], Toolkit.make()),
  makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
  ComputeEventLogger.layerFromTracing,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({}),
      CredentialsService.layerConfig([{ service: 'discord.com', apiKey: Config.redacted('DISCORD_TOKEN') }]),
      FetchHttpClient.layer,
      FunctionInvocationService.layerTest({ functions: [fetchDiscordMessages] }).pipe(
        Layer.provideMerge(ComputeEventLogger.layerFromTracing),
        Layer.provideMerge(TracingService.layerLogInfo()),
      ),
    ),
  ),
);

const DXOS_SERVER_ID = '837138313172353095';

describe('Feed', { timeout: 600_000 }, () => {
  it.effect(
    'fetch discord messages',
    Effect.fnUntraced(
      function* ({ expect: _ }) {
        const functionInvocationService = yield* FunctionInvocationService;
        const messages = yield* functionInvocationService.invokeFunction(fetchDiscordMessages, {
          serverId: DXOS_SERVER_ID,
          // channelId: '1404487604761526423',
          last: '7d',
        });
        console.log(messages);
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('sync'),
    ),
  );
});
