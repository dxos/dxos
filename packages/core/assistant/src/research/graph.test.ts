//
// Copyright 2025 DXOS.org
//

import { AnthropicClient } from '@effect/ai-anthropic';
import { describe, it } from '@effect/vitest';
import { Config, Effect, Layer, pipe } from 'effect';

import { AiService, AiServiceRouter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { tapHttpErrors } from '@dxos/ai/testing';
import { TestHelpers } from '@dxos/effect';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { FetchHttpClient } from '@effect/platform';
import { AiSession } from '../session';
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
);

describe('graph', () => {
  // let builder: EchoTestBuilder;
  // test('findRelatedSchema', async () => {
  //   const db = await createEchoDatabase();
  //   const relatedSchemas = await findRelatedSchema(db, Schema.Struct({}));
  // });

  it.effect.skip(
    'calculator',
    Effect.fn(
      function* ({ expect }) {
        const graphWriteToolkit = makeGraphWriterToolkit({ schema: [DataType.Project] });

        const session = new AiSession();
        const response = yield* session
          .run({
            prompt: 'What is 10 + 20?',
            history: [],
            toolkit: graphWriteToolkit,
          })
          .pipe(Effect.provide(makeGraphWriterHandler(graphWriteToolkit)));
        log.info('response', { response });
      },
      Effect.provide(TestLayer),
      TestHelpers.runIf(process.env.ANTHROPIC_API_KEY),
    ),
  );
});
