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
 * Ollama resolver using native Ollama API.
 *
 * curl http://localhost:11434/api/tags | jq
 */
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const make = ({
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  transformClient,
}: {
  readonly endpoint?: string;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
} = {}) => {
  // Create the client layer configured for Ollama's API format.
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: endpoint,
    apiFormat: 'ollama',
    transformClient,
  }).pipe(Layer.provide(FetchHttpClient.layer));

  // Create model layers with client dependency provided.
  const createModelLayer = (model: string) => ChatCompletionsAdapter.layer(model).pipe(Layer.provide(clientLayer));

  return AiModelResolver.AiModelResolver.fromModelMap(
    {
      name: 'Ollama',
    },
    Effect.succeed({
      'ai.google.model.gemma-3-27b': createModelLayer('gemma3:27b'),
      'ai.ollama.model.deepseek-r1:latest': createModelLayer('deepseek-r1:latest'),
      'ai.ollama.model.llama3.2:1b': createModelLayer('llama3.2:1b'),
      'ai.ollama.model.llama3:70b': createModelLayer('llama3:70b'),
      'ai.ollama.model.qwen2.5:14b': createModelLayer('qwen2.5:14b'),
      'ai.ollama.model.gpt-oss:20b': createModelLayer('gpt-oss:20b'),
      'ai.ollama.model.gemma4:latest': createModelLayer('gemma4:latest'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>),
  );
};
