//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AnthropicResolver, LMStudioResolver } from '@dxos/ai/resolvers';
import { tapHttpErrors } from '@dxos/ai/testing';
import { AiSession } from '@dxos/assistant';
import { Database } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Project } from '@dxos/types';

import { makeGraphWriterHandler, makeGraphWriterToolkit } from './graph';

// import { type EchoTestBuilder } from '@dxos/echo-db/testing';

const TestRouter = AiModelResolver.AiModelResolver.buildAiService.pipe(
  Layer.provide(AnthropicResolver.make()),
  Layer.provide(LMStudioResolver.make()),
  // Layer.provide(OpenAiResolver.OpenAiResolver),
);

const TestLayer = Function.pipe(
  AiService.model('@anthropic/claude-3-5-sonnet-20241022'),
  Layer.provideMerge(Database.Service.notAvailable),
  Layer.provideMerge(ToolResolverService.layerEmpty),
  Layer.provideMerge(ToolExecutionService.layerEmpty),
  Layer.provide(TestRouter),
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

  const Toolkit = makeGraphWriterToolkit({ schema: [Project.Project] });
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
