//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { AiService, ConsolePrinter } from '@dxos/ai';
import { AiServiceTestingPreset, EXA_API_KEY } from '@dxos/ai/testing';
import {
  AiSession,
  GenerationObserver,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import { CredentialsService, FunctionInvocationService } from '@dxos/functions';
import { TracingServiceExt } from '@dxos/functions-runtime';
import {
  FunctionInvocationServiceLayerTestMocked,
  TestDatabaseLayer,
  testStoragePath,
} from '@dxos/functions-runtime/testing';
import { CodeExecutionToolkit, EvalCodeExecutionLayer } from './code-execution';
import { Organization, Person, Task } from '@dxos/types';

const TestLayer = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-5'),
  makeToolResolverFromFunctions([], Toolkit.make()),
  makeToolExecutionServiceFromFunctions(Toolkit.make() as any, Layer.empty as any),
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      AiServiceTestingPreset('direct'),
      TestDatabaseLayer({
        indexing: { vector: true },
        types: [Organization.Organization, Person.Person, Task.Task],
        storagePath: testStoragePath({ name: 'feed-test' }),
      }),
      CredentialsService.layerConfig([
        // { service: 'exa.ai', apiKey: Config.succeed(Redacted.make(EXA_API_KEY)) },
        // { service: 'discord.com', apiKey: Config.redacted('DISCORD_TOKEN') },
        // { service: 'linear.app', apiKey: Config.redacted('LINEAR_API_KEY') },
      ]),
      FunctionInvocationServiceLayerTestMocked({ functions: [] }).pipe(
        Layer.provideMerge(TracingServiceExt.layerLogInfo()),
      ),
      FetchHttpClient.layer,
    ),
  ),
);

describe('Code execution', { timeout: 600_000 }, () => {
  it.effect(
    'execute code',
    Effect.fnUntraced(
      function* (_) {
        yield* new AiSession().run({
          prompt: 'Generate an example CRM with 10-15 objects and dump it to json',
          toolkit: yield* CodeExecutionToolkit.pipe(Effect.provide(EvalCodeExecutionLayer)),
          observer: GenerationObserver.fromPrinter(new ConsolePrinter()),
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.taggedTest('llm'),
    ),
  );
});
