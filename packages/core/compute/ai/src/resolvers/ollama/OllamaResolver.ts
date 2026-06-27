//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { AiModelNotAvailableError } from '../../errors';
import * as ChatCompletionsAdapter from '../ChatCompletionsAdapter';

/**
 * Ollama resolver using native Ollama API.
 *
 * curl http://localhost:11434/api/tags | jq
 */
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

/** Prefix shared by all Ollama model ids; the suffix is the raw `ollama` model name. */
const OLLAMA_MODEL_PREFIX = 'ai.ollama.model.';

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

  // Resolve any `ai.ollama.model.*` id dynamically so models pulled at runtime work without
  // rebuilding the resolver; the suffix is the raw model name passed to Ollama.
  return AiModelResolver.AiModelResolver.resolver(
    {
      name: 'Ollama',
    },
    Effect.succeed((model: ModelName) =>
      model.startsWith(OLLAMA_MODEL_PREFIX)
        ? createModelLayer(model.slice(OLLAMA_MODEL_PREFIX.length))
        : Layer.fail(new AiModelNotAvailableError(model)),
    ),
  );
};
