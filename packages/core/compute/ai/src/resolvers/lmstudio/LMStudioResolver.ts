//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { DXN } from '@dxos/keys';

import * as AiModelResolver from '../../AiModelResolver';
import { type AiModelNotAvailableError } from '../../errors';
import * as Model from '../../Model';
import * as Provider from '../../Provider';
import * as ChatCompletionsAdapter from '../ChatCompletionsAdapter';

/**
 * LM Studio resolver using the OpenAI-compatible Chat Completions API.
 *
 * curl http://localhost:1234/v1/models | jq
 */
export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234';

export const make = ({
  endpoint = DEFAULT_LMSTUDIO_ENDPOINT,
  transformClient,
  models = Model.forProvider(Provider.lmStudio.id),
}: {
  readonly endpoint?: string;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
  /** Models this resolver serves; defaults to the curated LM Studio catalog. */
  readonly models?: readonly Model.Model[];
} = {}) => {
  // Create the base layers that provide ChatCompletionsClient.
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: endpoint,
    apiFormat: 'openai',
    transformClient,
  }).pipe(Layer.provide(FetchHttpClient.layer));

  // Create model layers with the client dependency provided.
  const createModelLayer = (model: string) => ChatCompletionsAdapter.layer(model).pipe(Layer.provide(clientLayer));

  // Derive the id → model-layer map from the provider's catalog models (id → back-end name).
  const modelMap: Partial<Record<DXN.DXN, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>> =
    {};
  for (const model of models) {
    modelMap[model.id] = createModelLayer(model.backend);
  }

  return AiModelResolver.AiModelResolver.fromModelMap(
    { name: 'LM Studio' },
    Provider.lmStudio.id,
    Effect.succeed(modelMap),
  );
};
