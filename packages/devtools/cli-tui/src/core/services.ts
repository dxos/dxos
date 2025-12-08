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
  AiModelResolver,
  type AiService,
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
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database } from '@dxos/echo';
import {
  CredentialsService,
  type FunctionInvocationService,
  QueueService,
  TracingService,
  defineFunction,
} from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
} from '@dxos/functions-runtime';

export { DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL };

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
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

export type LayerOptions = {
  client: Client;
  space: Space;
};

export type LayerFactoryResult = {
  model: ModelName;
  layer: Layer.Layer<AiChatServices, any, any>;
};

export type LayerFactory = (options: LayerOptions) => LayerFactoryResult;

export const createBaseLayer = (
  aiServiceLayer: Layer.Layer<AiService.AiService, any, any>,
  { client, space }: LayerOptions,
) => {
  return Layer.mergeAll(
    makeToolResolverFromFunctions([fn], toolkit),
    makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
    TracingService.layerNoop,
  ).pipe(
    // TODO(burdon): Factor out from compute-runtime.ts
    Layer.provideMerge(
      FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
        Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: [fn] })),
        Layer.provideMerge(
          RemoteFunctionExecutionService.fromClient(
            client,
            // If agent is not enabled do not provide spaceId because space context will be unavailable on EDGE.
            client.config.get('runtime.client.edgeFeatures.agents') ? space.id : undefined,
          ),
        ),
        Layer.provideMerge(aiServiceLayer),
        Layer.provideMerge(CredentialsService.layerFromDatabase()),
        Layer.provideMerge(space ? Database.Service.layer(space.db) : Database.Service.notAvailable),
        Layer.provideMerge(space ? QueueService.layer(space.queues) : QueueService.notAvailable),
      ),
    ),
  );
};

/**
 * EDGE
 */
export const createEdgeLayer: LayerFactory = (options: LayerOptions) => {
  return {
    model: DEFAULT_EDGE_MODEL,
    layer: createBaseLayer(AiServiceTestingPreset('direct'), options),
  };
};

/**
 * Ollama
 */
export const createOllamaLayer: LayerFactory = (options) => {
  return {
    model: DEFAULT_OLLAMA_MODEL,
    layer: createBaseLayer(
      AiModelResolver.AiModelResolver.buildAiService.pipe(
        Layer.provide(OllamaResolver.make().pipe(Layer.provide(FetchHttpClient.layer))),
      ),
      options,
    ),
  };
};

/**
 * LMStudio
 */
export const createLMStudioLayer: LayerFactory = (options) => {
  return {
    model: DEFAULT_LMSTUDIO_MODEL,
    layer: createBaseLayer(
      AiModelResolver.AiModelResolver.buildAiService.pipe(
        Layer.provide(LMStudioResolver.make().pipe(Layer.provide(FetchHttpClient.layer))),
      ),
      options,
    ),
  };
};
