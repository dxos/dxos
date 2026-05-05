//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Config from 'effect/Config';
import type * as ConfigError from 'effect/ConfigError';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import * as AiModelResolver from '../AiModelResolver';
import type * as AiService from '../AiService';
import { AnthropicResolver, LMStudioResolver, OllamaResolver } from '../resolvers';
import { MemoizedAiService } from './memoization';
import { tapHttpErrors } from './tap';

export type AiServiceLayer = Layer.Layer<AiService.AiService, ConfigError.ConfigError, never>;

// TODO(burdon): Adapt Config to @dxos/config.

export const TestRouter = AiModelResolver.AiModelResolver.buildAiService.pipe(
  Layer.provide(AnthropicResolver.make()),
  Layer.provide(LMStudioResolver.make()),
  // Layer.provide(OpenAiResolver.OpenAiResolver),
);

/**
 * AiService that directly accesses remote cloud providers.
 * API keys are taken from environment variables.
 */
export const DirectAiServiceLayer: AiServiceLayer = TestRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiKey: Config.redacted('ANTHROPIC_API_KEY').pipe(Config.withDefault(Redacted.make('not-a-real-key'))),
      transformClient: tapHttpErrors,
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

/**
 * Uses local EDGE AI-service instance (running on `localhost:8788`).
 */
export const LocalEdgeAiServiceLayer: AiServiceLayer = TestRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiUrl: Config.succeed('http://localhost:8788/provider/anthropic'),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

/**
 * Uses hosted EDGE AI-service instance.
 */
export const RemoteEdgeAiServiceLayer: AiServiceLayer = TestRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiUrl: Config.succeed('https://ai-service.dxos.workers.dev/provider/anthropic'),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

/**
 * Uses a local Ollama instance (running on `localhost:11434`).
 *
 * Start ollama with CORS enabled:
 * ```bash
 * OLLAMA_ORIGINS="*" ollama serve
 * ```
 */
export const OllamaAiServiceLayer: AiServiceLayer = AiModelResolver.AiModelResolver.buildAiService.pipe(
  Layer.provide(OllamaResolver.make()),
  Layer.provide(FetchHttpClient.layer),
);

export type AiServicePreset = 'direct' | 'edge-local' | 'edge-remote' | 'ollama';

/**
 * Create an appropriate testing layer based on the preset.
 */
export const AiServiceTestingPreset = (preset: AiServicePreset): AiServiceLayer => {
  switch (preset) {
    case 'edge-local':
      return LocalEdgeAiServiceLayer;
    case 'edge-remote':
      return RemoteEdgeAiServiceLayer;
    case 'ollama':
      return OllamaAiServiceLayer;
    case 'direct':
    default:
      return DirectAiServiceLayer;
  }
};

/**
 * AiService for testing.
 * Refer to {@link MemoizedAiService} documentation for details on how memoization works.
 *
 * Defaults to the `edge-remote` preset so cache regeneration (`ALLOW_LLM_GENERATION=1`)
 * works without requiring `ANTHROPIC_API_KEY` — the DXOS edge worker proxies the request.
 */
export const TestAiService = ({
  disableMemoization = false,
  preset = 'edge-remote',
}: { disableMemoization?: boolean; preset?: AiServicePreset } = {}) => {
  if (disableMemoization) {
    return AiServiceTestingPreset(preset);
  } else {
    return MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset(preset)));
  }
};
