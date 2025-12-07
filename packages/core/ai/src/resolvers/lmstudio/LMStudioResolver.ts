//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import * as ChatCompletions from '../../ChatCompletionsLanguageModel';
import { type ModelName } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

/**
 * LM Studio resolver using OpenAI-compatible Chat Completions API.
 *
 * Uses the `/v1/chat/completions` endpoint.
 *
 * curl http://localhost:1234/v1/models | jq
 */
export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234';

export const make = ({
  endpoint = DEFAULT_LMSTUDIO_ENDPOINT,
}: {
  readonly endpoint?: string;
} = {}) => {
  // Create the base layers that provide ChatCompletionsClient.
  const clientLayer = ChatCompletions.clientLayer({
    baseUrl: endpoint,
    apiFormat: 'openai',
  }).pipe(Layer.provide(FetchHttpClient.layer));

  // Create model layers with client dependency provided.
  const createModelLayer = (model: string) => ChatCompletions.layer(model).pipe(Layer.provide(clientLayer));

  return AiModelResolver.AiModelResolver.fromModelMap(
    Effect.succeed({
      '@google/gemma-3-27b': createModelLayer('google/gemma-3-27b'),
      '@meta/llama-3.1-8b-instruct': createModelLayer('meta-llama-3.1-8b-instruct'),
      '@meta/llama-3.2-3b-instruct': createModelLayer('llama-3.2-3b-instruct'),
      'ministral-3-14b-reasoning': createModelLayer('ministral-3-14b-reasoning'),
      'openai/gpt-oss-20b': createModelLayer('openai/gpt-oss-20b'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>),
  );
};
