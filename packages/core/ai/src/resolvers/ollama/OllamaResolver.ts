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
 * Ollama resolver using native Ollama API.
 *
 * Uses Ollama's `/api/chat` endpoint directly via ChatCompletionsLanguageModel.
 */
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const make = ({
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
}: {
  readonly endpoint?: string;
} = {}) => {
  // Create the client layer configured for Ollama's API format.
  const clientLayer = ChatCompletions.clientLayer({
    baseUrl: endpoint,
    apiFormat: 'ollama',
  }).pipe(Layer.provide(FetchHttpClient.layer));

  // Create model layers with client dependency provided.
  const createModelLayer = (model: string) => ChatCompletions.layer(model).pipe(Layer.provide(clientLayer));

  return AiModelResolver.AiModelResolver.fromModelMap(
    'Ollama',
    Effect.succeed({
      '@google/gemma-3-27b': createModelLayer('gemma3:27b'),
      'deepseek-r1:latest': createModelLayer('deepseek-r1:latest'),
      'llama3.2:1b': createModelLayer('llama3.2:1b'),
      'llama3:70b': createModelLayer('llama3:70b'),
      'qwen2.5:14b': createModelLayer('qwen2.5:14b'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>),
  );
};
