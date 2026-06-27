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

import { AssistantCapabilities } from '#types';

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
const localModelResolver = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const contributions = [
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
    ];

    // The native (desktop) plugin runs a bundled Ollama sidecar on its own port and contributes its
    // own resolver + manager. Skip the default-endpoint (11434) resolver there so it does not shadow
    // the sidecar resolver for `ai.ollama.model.*` ids. The web/dev runtime has no manager, so it
    // keeps the default Ollama resolver pointed at a user-run server.
    const nativeOllama = yield* Capability.getAll(AssistantCapabilities.OllamaManager);
    if (nativeOllama.length === 0) {
      contributions.push(
        Capability.contributes(
          AppCapabilities.AiModelResolver,
          OllamaResolver.make({
            transformClient: HttpClient.withTracerPropagation(false),
          }).pipe(Layer.provide(FetchHttpClient.layer)),
        ),
      );
    }

    return contributions;
  }),
);

export default localModelResolver;
