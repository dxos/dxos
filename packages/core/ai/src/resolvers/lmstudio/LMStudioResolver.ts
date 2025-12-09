//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
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

  return AiModelResolver.AiModelResolver.fromModelMap(
    {
      name: 'LM Studio',
    },
    Effect.succeed({
      '@google/gemma-3-27b': createModelLayer('google/gemma-3-27b'),
      '@meta/llama-3.1-8b-instruct': createModelLayer('meta-llama-3.1-8b-instruct'),
      '@meta/llama-3.2-3b-instruct': createModelLayer('llama-3.2-3b-instruct'),
      'ministral-3-14b-reasoning': createModelLayer('ministral-3-14b-reasoning'),
      'openai/gpt-oss-20b': createModelLayer('openai/gpt-oss-20b'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>),
  );
};
