//
// Copyright 2025 DXOS.org
//

import { AnthropicClient } from '@effect/ai-anthropic';
import { FetchHttpClient } from '@effect/platform';
import { Layer } from 'effect';

import { AiServiceRouter } from '@dxos/ai';
import { contributes } from '@dxos/app-framework';

import { AssistantCapabilities } from './capabilities';

export default () => {
  return [
    contributes(
      AssistantCapabilities.AiModelResolver,
      AiServiceRouter.AnthropicResolver.pipe(
        Layer.provide(
          AnthropicClient.layer({
            // TODO(dmaretskyi): Read endpoint from config/settings.
            apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic',
          }),
        ),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
  ];
};
