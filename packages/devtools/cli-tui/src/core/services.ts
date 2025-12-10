//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

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
import { GenericToolkit, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database } from '@dxos/echo';
import { CredentialsService, type FunctionInvocationService, QueueService, TracingService } from '@dxos/functions';
import {
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  RemoteFunctionExecutionService,
} from '@dxos/functions-runtime';

import * as TestToolkit from './TestToolkit';

export { DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL };

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)

export type AiChatServices =
  | AiService.AiService
  | CredentialsService
  | Database.Service
  | FunctionInvocationService
  | QueueService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

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
  const testToolkit = GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer);
  const mergedToolkit = GenericToolkit.merge(...[testToolkit]);
  const toolkit = mergedToolkit.toolkit;
  const toolkitLayer = mergedToolkit.layer;

  return Layer.mergeAll(
    TracingService.layerNoop,
    makeToolResolverFromFunctions(TestToolkit.functions, toolkit),
    makeToolExecutionServiceFromFunctions(toolkit, toolkitLayer),
  ).pipe(
    // TODO(burdon): Factor out from compute-runtime.ts
    Layer.provideMerge(
      FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
        Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: TestToolkit.functions })),
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

export type Provider = 'edge' | 'lmstudio' | 'ollama';

export const getLayer = (provider: Provider, options: LayerOptions): LayerFactoryResult => {
  switch (provider) {
    case 'lmstudio':
      return createLMStudioLayer(options);
    case 'ollama':
      return createOllamaLayer(options);
    case 'edge':
    default:
      return createEdgeLayer(options);
  }
};

/**
 * EDGE
 */
const createEdgeLayer: LayerFactory = (options: LayerOptions) => {
  return {
    model: DEFAULT_EDGE_MODEL,
    layer: createBaseLayer(AiServiceTestingPreset('direct'), options),
  };
};

/**
 * Ollama
 */
const createOllamaLayer: LayerFactory = (options) => {
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
const createLMStudioLayer: LayerFactory = (options) => {
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
