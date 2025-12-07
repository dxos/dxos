//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
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
import { type Database } from '@dxos/echo';
import { CredentialsService, type FunctionInvocationService, type QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked, TestDatabaseLayer } from '@dxos/functions-runtime/testing';

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
    description: 'Random number generator',
    parameters: {},
    success: Schema.Number,
  }),
);

// TODO(burdon): Create minimal toolkit.
const toolkit = Toolkit.merge(TestToolkit) as Toolkit.Toolkit<any>;

// TODO(burdon): Consolidate with @dxos/ai.
export const BaseLayer = Layer.mergeAll(
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
  TracingService.layerNoop,
).pipe(
  Layer.provideMerge(TestDatabaseLayer({})),
  Layer.provideMerge(
    FunctionInvocationServiceLayerTestMocked({
      functions: [],
    }).pipe(Layer.provideMerge(TracingService.layerNoop)),
  ),
);

export { DEFAULT_EDGE_MODEL, DEFAULT_LMSTUDIO_MODEL, DEFAULT_OLLAMA_MODEL };

/**
 * EDGE
 */
export const createTestLayer = (model: ModelName = DEFAULT_EDGE_MODEL): Layer.Layer<AiChatServices, never, never> =>
  Layer.mergeAll(BaseLayer, AiService.model(model)).pipe(
    Layer.provideMerge(AiServiceTestingPreset('direct')),
    Layer.orDie,
  );

/**
 * Ollama
 */
export const createOllamaLayer = (model: ModelName = DEFAULT_OLLAMA_MODEL): Layer.Layer<AiChatServices, never, never> =>
  Layer.mergeAll(BaseLayer, AiService.model(model)).pipe(
    Layer.provideMerge(
      AiModelResolver.AiModelResolver.buildAiService.pipe(
        Layer.provide(OllamaResolver.make()),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Layer.orDie,
  );

/**
 * LMStudio
 */
export const createLMStudioLayer = (
  model: ModelName = DEFAULT_LMSTUDIO_MODEL,
): Layer.Layer<AiChatServices, never, never> =>
  Layer.mergeAll(BaseLayer, AiService.model(model)).pipe(
    Layer.provideMerge(
      AiModelResolver.AiModelResolver.buildAiService.pipe(
        Layer.provide(LMStudioResolver.make()),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Layer.orDie,
  );
