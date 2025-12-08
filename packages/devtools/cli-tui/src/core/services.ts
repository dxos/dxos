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
  model?: ModelName;
  serviceLayer?: Layer.Layer<AiService.AiService>;
};

export type LayerFactory = (options: LayerOptions) => Layer.Layer<AiChatServices, never, never>;

export const createBaseLayer = ({ client, space, serviceLayer }: LayerOptions) => {
  const spaceId = space?.id;
  const aiServiceLayer = serviceLayer ?? Layer.die('AiService not found');

  return Layer.mergeAll(
    makeToolResolverFromFunctions([fn], toolkit),
    makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
    CredentialsService.layerFromDatabase(),
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
            client.config.get('runtime.client.edgeFeatures.agents') ? spaceId : undefined,
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
export const createTestLayer: LayerFactory = (options): Layer.Layer<AiChatServices, never, never> =>
  Layer.mergeAll(
    createBaseLayer(options),
    AiService.model(options.model ?? DEFAULT_EDGE_MODEL).pipe(Layer.provideMerge(AiServiceTestingPreset('direct'))),
  ).pipe(Layer.orDie);

/**
 * Ollama
 */
export const createOllamaLayer: LayerFactory = (options): Layer.Layer<AiChatServices, never, never> =>
  Layer.mergeAll(
    createBaseLayer(options),
    AiService.model(options.model ?? DEFAULT_OLLAMA_MODEL).pipe(
      Layer.provideMerge(
        AiModelResolver.AiModelResolver.buildAiService.pipe(
          Layer.provide(OllamaResolver.make().pipe(Layer.provide(FetchHttpClient.layer))),
        ),
      ),
    ),
  ).pipe(Layer.orDie);

/**
 * LMStudio
 */
export const createLMStudioLayer: LayerFactory = (options): Layer.Layer<AiChatServices, never, never> =>
  Layer.mergeAll(
    createBaseLayer(options),
    AiService.model(options.model ?? DEFAULT_LMSTUDIO_MODEL).pipe(
      Layer.provideMerge(
        AiModelResolver.AiModelResolver.buildAiService.pipe(
          Layer.provide(LMStudioResolver.make().pipe(Layer.provide(FetchHttpClient.layer))),
        ),
      ),
    ),
  ).pipe(Layer.orDie);
