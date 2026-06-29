//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { DXN } from '@dxos/keys';

import * as AiModelResolver from '../../AiModelResolver';
import * as Model from '../../Model';
import * as Provider from '../../Provider';
import { AiModelNotAvailableError } from '../../errors';
import * as ChatCompletionsAdapter from '../ChatCompletionsAdapter';

/**
 * Ollama resolver using the native Ollama API.
 *
 * curl http://localhost:11434/api/tags | jq
 */
export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const make = ({
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  transformClient,
  provider = Provider.ollama.id,
  models = Model.forProvider(provider),
}: {
  readonly endpoint?: string;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
  /** The provider this resolver serves; `built-in` (the sidecar) passes its own id. */
  readonly provider?: DXN.DXN;
  /** Models this resolver serves; defaults to the provider's curated catalog. Local providers pass a
   * list extended with installed tags so runtime-pulled models resolve too. */
  readonly models?: readonly Model.Model[];
} = {}) => {
  // Create the client layer configured for Ollama's API format.
  const clientLayer = ChatCompletionsAdapter.clientLayer({
    baseUrl: endpoint,
    apiFormat: 'ollama',
    transformClient,
  }).pipe(Layer.provide(FetchHttpClient.layer));

  // Create model layers with the client dependency provided.
  const createModelLayer = (model: string) => ChatCompletionsAdapter.layer(model).pipe(Layer.provide(clientLayer));

  // Map each model id (DXN) to the raw Ollama tag passed to the back-end.
  const backendById = new Map(models.map((model) => [model.id, model.backend]));

  return AiModelResolver.AiModelResolver.resolver(
    {
      name: 'Ollama',
    },
    Effect.succeed((model: DXN.DXN, options) => {
      const backend = options?.provider === provider ? backendById.get(model) : undefined;
      return backend ? createModelLayer(backend) : Layer.fail(new AiModelNotAvailableError(model));
    }),
  );
};
