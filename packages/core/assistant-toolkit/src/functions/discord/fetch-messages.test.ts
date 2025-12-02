//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService, FunctionInvocationService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

import { default as fetchMessages } from './fetch-messages';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], Toolkit.make()),
  makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({}),
      CredentialsService.layerConfig([{ service: 'discord.com', apiKey: Config.redacted('DISCORD_TOKEN') }]),
      FetchHttpClient.layer,
      FunctionInvocationServiceLayerTestMocked({ functions: [fetchMessages] }).pipe(
        Layer.provideMerge(TracingService.layerNoop),
      ),
    ),
  ),
);

const DXOS_SERVER_ID = '837138313172353095';

describe('Feed', { timeout: 600_000 }, () => {
  it.effect(
    'fetch discord messages',
    Effect.fnUntraced(
      function* (_) {
        const messages = yield* FunctionInvocationService.invokeFunction(fetchMessages, {
          serverId: DXOS_SERVER_ID,
          // channelId: '1404487604761526423',
          last: '7d',
        });
        console.log(messages);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('sync'),
    ),
  );
});
