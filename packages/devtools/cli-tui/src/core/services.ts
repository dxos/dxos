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
  DEFAULT_OLLAMA_MODEL,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import { OllamaResolver } from '@dxos/ai/resolvers';
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

export const DEFAULT_MODEL = DEFAULT_EDGE_MODEL;

const TestServicesLayer = Layer.mergeAll(
  TracingService.layerNoop,
  AiServiceTestingPreset('direct'),
  TestDatabaseLayer({}),
  FunctionInvocationServiceLayerTestMocked({
    functions: [],
  }).pipe(Layer.provideMerge(TracingService.layerNoop)),
);

export const TestLayer: Layer.Layer<AiChatServices, never, never> = Layer.mergeAll(
  AiService.model(DEFAULT_MODEL),
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
).pipe(Layer.provideMerge(TestServicesLayer), Layer.orDie);

export const OllamaServicesLayer = Layer.mergeAll(
  TracingService.layerNoop,
  AiModelResolver.AiModelResolver.buildAiService.pipe(
    Layer.provide(OllamaResolver.OllamaResolver()),
    Layer.provide(FetchHttpClient.layer),
  ),
  TestDatabaseLayer({}),
  FunctionInvocationServiceLayerTestMocked({
    functions: [],
  }).pipe(Layer.provideMerge(TracingService.layerNoop)),
);

/**
 * Layer that configures the Ollama AiServiceProvider.
 */
export const OllamaLayer: Layer.Layer<AiChatServices, never, never> = Layer.mergeAll(
  AiService.model(DEFAULT_OLLAMA_MODEL),
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
).pipe(Layer.provideMerge(OllamaServicesLayer), Layer.orDie);
