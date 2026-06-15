//
// Copyright 2025 DXOS.org
//

import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { LMStudioResolver, OllamaResolver } from '@dxos/ai/resolvers';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

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
const localModelResolver = Capability.makeModule<[]>(() =>
  Effect.succeed([
    Capability.contributes(
      AppCapabilities.AiModelResolver,
      LMStudioResolver.make().pipe(
        Layer.provide(
          OpenAiClient.layer({
            apiUrl: LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT,
          }),
        ),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Capability.contributes(
      AppCapabilities.AiModelResolver,
      OllamaResolver.make({
        transformClient: HttpClient.withTracerPropagation(false),
      }).pipe(Layer.provide(FetchHttpClient.layer)),
    ),
  ]),
);

export default localModelResolver;
