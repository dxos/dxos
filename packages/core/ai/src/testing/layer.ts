//
// Copyright 2025 DXOS.org
//

import { AnthropicClient } from '@effect/ai-anthropic';
import { FetchHttpClient } from '@effect/platform';
import { Config, type ConfigError, Layer } from 'effect';

import { type AiService } from '../AiService';
import * as AiServiceRouter from '../AiServiceRouter';
import { tapHttpErrors } from './tap';

export type AiServiceLayer = Layer.Layer<AiService, ConfigError.ConfigError, never>;

// TODO(burdon): Adapt Config to @dxos/config.

/**
 * AiService that directly accesses remote cloud providers.
 * API keys are taken from environment variables.
 */
export const DirectAiServiceLayer: AiServiceLayer = AiServiceRouter.AiServiceRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiKey: Config.redacted('ANTHROPIC_API_KEY'),
      transformClient: tapHttpErrors,
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

/**
 * Uses local EDGE AI-service instance (running on `localhost:8788`).
 */
export const LocalEdgeAiServiceLayer: AiServiceLayer = AiServiceRouter.AiServiceRouter.pipe(
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
export const RemoteEdgeAiServiceLayer: AiServiceLayer = AiServiceRouter.AiServiceRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiUrl: Config.succeed('https://ai-service.dxos.workers.dev/provider/anthropic'),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

/**
 * Create an appropriate testing layer based on the preset.
 */
export const AiServiceTestingPreset = (preset: 'direct' | 'edge-local' | 'edge-remote'): AiServiceLayer => {
  switch (preset) {
    case 'edge-local':
      return LocalEdgeAiServiceLayer;
    case 'edge-remote':
      return RemoteEdgeAiServiceLayer;
    case 'direct':
    default:
      return DirectAiServiceLayer;
  }
};
