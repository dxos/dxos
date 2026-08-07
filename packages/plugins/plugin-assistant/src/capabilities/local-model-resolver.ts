//
// Copyright 2025 DXOS.org
//

import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';

import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/**
 * To start LM Studio server:
 * ```bash
 * ~/.lmstudio/bin/lms server start --cors
 * ```
 *
 * To start Ollama server:
 * ```bash
 * OLLAMA_ORIGINS="*" ollama serve
 * ```
 */
const localModelResolver = Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributeAll(AppCapabilities.AiModelResolver, [
      LMStudioResolver.make().pipe(
        Layer.provide(
          OpenAiClient.layer({
            apiUrl: LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT,
          }),
        ),
        Layer.provide(FetchHttpClient.layer),
      ),
      OllamaResolver.make({
        transformClient: HttpClient.transformResponse(
          Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        ),
      }).pipe(Layer.provide(FetchHttpClient.layer)),
    ]),
  ),
);

export default localModelResolver;
