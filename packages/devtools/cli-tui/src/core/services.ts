//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import {
  AiModelNotAvailableError,
  AiModelResolver,
  AiService,
  DEFAULT_EDGE_MODEL,
  DEFAULT_LMSTUDIO_MODEL,
  DEFAULT_OLLAMA_MODEL,
  type ModelName,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { type Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { CredentialsService, type FunctionInvocationService, type QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

export { DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL };

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | AiModelResolver.AiModelResolver
  | CredentialsService
  | Database.Service
  | QueueService
  | FunctionInvocationService
  | AiService.AiService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

const TestToolkit = Toolkit.make(
  Tool.make('random', {
    description: 'Generates a random number.',
    parameters: {},
    success: Schema.Number,
  }),
);

// TODO(burdon): Create minimal toolkit.
const toolkit = Toolkit.merge(TestToolkit) as Toolkit.Toolkit<any>;

// TODO(burdon): Not hooked up.
const fn = defineFunction({
  key: 'example.com/function/random',
  name: 'Random',
  description: 'Generates a random number.',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Struct({
    value: Schema.Number,
  }),
  handler: Effect.fn(function* () {
    return {
      value: Math.floor(Math.random() * 100),
    };
  }),
});

// TODO(burdon): See compute-runtime.ts
export const BaseLayer = Layer.mergeAll(
  makeToolResolverFromFunctions([fn], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
  TracingService.layerNoop,
).pipe(
  Layer.provideMerge(
    //
    TestDatabaseLayer({
      types: [],
    }),
  ),
  Layer.provideMerge(
    FunctionInvocationServiceLayerTestMocked({
      functions: [fn],
    }).pipe(Layer.provideMerge(TracingService.layerNoop)),
  ),
);

/**
 * EDGE
 */
export const createTestLayer = (model: ModelName = DEFAULT_EDGE_MODEL): Layer.Layer<AiChatServices, never, never> => {
  // AiServiceTestingPreset provides AiService but not AiModelResolver, so we need to create a resolver layer.
  const resolverLayer = AiModelResolver.AiModelResolver.resolver(
    'EDGE',
    Effect.succeed((modelName: ModelName) => Layer.fail(new AiModelNotAvailableError(modelName))),
  );
  return Layer.mergeAll(BaseLayer, AiService.model(model)).pipe(
    Layer.provideMerge(AiServiceTestingPreset('direct')),
    Layer.provideMerge(resolverLayer),
    Layer.orDie,
  );
};

/**
 * Ollama
 */
export const createOllamaLayer = (
  model: ModelName = DEFAULT_OLLAMA_MODEL,
): Layer.Layer<AiChatServices, never, never> => {
  const resolverLayer = OllamaResolver.make().pipe(Layer.provide(FetchHttpClient.layer));
  return Layer.mergeAll(BaseLayer, AiService.model(model)).pipe(
    Layer.provideMerge(AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provide(resolverLayer))),
    Layer.provideMerge(resolverLayer),
    Layer.orDie,
  );
};

/**
 * LMStudio
 */
export const createLMStudioLayer = (
  model: ModelName = DEFAULT_LMSTUDIO_MODEL,
): Layer.Layer<AiChatServices, never, never> => {
  const resolverLayer = LMStudioResolver.make().pipe(Layer.provide(FetchHttpClient.layer));
  return Layer.mergeAll(BaseLayer, AiService.model(model)).pipe(
    Layer.provideMerge(AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provide(resolverLayer))),
    Layer.provideMerge(resolverLayer),
    Layer.orDie,
  );
};
