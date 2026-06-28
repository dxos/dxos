//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName, modelsBySource } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';
import * as ChatCompletionsAdapter from '../ChatCompletionsAdapter';

/**
 * LM Studio resolver using OpenAI-compatible Chat Completions API.
 *
 * curl http://localhost:1234/v1/models | jq
 */
export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234';

export const make = ({
  endpoint = DEFAULT_LMSTUDIO_ENDPOINT,
  transformClient,
}: {
  readonly endpoint?: string;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
} = {}) => {
  // Create the base layers that provide ChatCompletionsClient.
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: endpoint,
    apiFormat: 'openai',
    transformClient,
  }).pipe(Layer.provide(FetchHttpClient.layer));

  // Create model layers with client dependency provided.
  const createModelLayer = (model: string) => ChatCompletionsAdapter.layer(model).pipe(Layer.provide(clientLayer));

  // Derive the id → model-layer map from the catalog's `lmstudio` models (id → back-end name).
  const modelMap: Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>> =
    {};
  for (const model of modelsBySource('lmstudio')) {
    modelMap[model.id] = createModelLayer(model.backend);
  }

  return AiModelResolver.AiModelResolver.fromModelMap({ name: 'LM Studio' }, Effect.succeed(modelMap));
};
