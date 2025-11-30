//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Config from 'effect/Config';
import type * as ConfigError from 'effect/ConfigError';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';

import { type AiService } from '../AiService';
import * as AiServiceRouter from '../AiServiceRouter';

import { MemoizedAiService } from './memoization';
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
      apiKey: Config.redacted('ANTHROPIC_API_KEY').pipe(Config.withDefault(Redacted.make('not-a-real-key'))),
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

/**
 * AiService for testing.
 * Refer to {@link MemoizedAiService} documentation for details on how memoization works.
 */
export const TestAiService = ({ disableMemoization = false }: { disableMemoization?: boolean } = {}) => {
  if (disableMemoization) {
    return AiServiceTestingPreset('direct');
  } else {
    return MemoizedAiService.layerTest().pipe(Layer.provide(AiServiceTestingPreset('direct')));
  }
};
