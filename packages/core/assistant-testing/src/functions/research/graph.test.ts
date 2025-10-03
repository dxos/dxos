//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import { FetchHttpClient } from '@effect/platform';
import { describe, it } from '@effect/vitest';
import { Config, Effect, Layer, pipe } from 'effect';

import { AiService, AiServiceRouter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { tapHttpErrors } from '@dxos/ai/testing';
import { AiSession } from '@dxos/assistant';
import { TestHelpers } from '@dxos/effect';
import { DatabaseService, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';

// import { type EchoTestBuilder } from '@dxos/echo-db/testing';

const TestLayer = pipe(
  AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
  Layer.provideMerge(DatabaseService.notAvailable),
  Layer.provideMerge(ToolResolverService.layerEmpty),
  Layer.provideMerge(ToolExecutionService.layerEmpty),
  Layer.provide(AiServiceRouter.AiServiceRouter),
  Layer.provide(
    AnthropicClient.layerConfig({
      apiKey: Config.redacted('ANTHROPIC_API_KEY'),
      transformClient: tapHttpErrors,
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
  Layer.provideMerge(TracingService.layerNoop),
);

describe('graph', () => {
  // let builder: EchoTestBuilder;
  // test('findRelatedSchema', async () => {
  //   const db = await createEchoDatabase();
  //   const relatedSchemas = await findRelatedSchema(db, Schema.Struct({}));
  // });

  const Toolkit = makeGraphWriterToolkit({ schema: [DataType.Project] });
  const ToolkitLayer = makeGraphWriterHandler(Toolkit);

  it.effect.skip(
    'calculator',
    Effect.fn(
      function* (_) {
        const session = new AiSession();
        const toolkit = yield* Toolkit;
        const response = yield* session.run({
          toolkit,
          prompt: 'What is 10 + 20?',
        });

        log.info('response', { response });
      },
      Effect.provide(Layer.mergeAll(TestLayer, ToolkitLayer)),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});
