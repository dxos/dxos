import { Config, Layer, type ConfigError } from 'effect';

import { AnthropicClient } from '@effect/ai-anthropic';
import { NodeHttpClient } from '@effect/platform-node';
import { AiServiceRouter } from '../experimental';
import { AiService } from '../service';

/**
 * AiService that directly accesses remote cloud providers.
 * API keys are taken from environment variables.
 */
export const DirectAiServiceLayer = AiServiceRouter.AiServiceRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiKey: Config.redacted('ANTHROPIC_API_KEY'),
    }),
  ),
  Layer.provide(NodeHttpClient.layerUndici),
);

/**
 * Uses local EDGE AI-service instance (running on `localhost:8788`).
 */
export const LocalEdgeAiServiceLayer = AiServiceRouter.AiServiceRouter.pipe(
  Layer.provide(
    AnthropicClient.layerConfig({
      apiUrl: Config.succeed('http://localhost:8788/provider/anthropic'),
    }),
  ),
  Layer.provide(NodeHttpClient.layerUndici),
);

/**
 * Create an appropriate testing layer based on the preset.
 */
export const AiServiceTestingPreset = (
  preset: 'direct' | 'local-edge' | 'remote-edge',
): Layer.Layer<AiService, ConfigError.ConfigError, never> => {
  switch (preset) {
    case 'direct':
      return DirectAiServiceLayer;
    case 'local-edge':
      return LocalEdgeAiServiceLayer;
    case 'remote-edge':
      return Layer.die(new Error('Remote edge AI service is not implemented'));
  }
};
