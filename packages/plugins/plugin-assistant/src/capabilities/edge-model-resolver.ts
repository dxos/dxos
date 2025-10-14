//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import * as AiServiceRouter from '@dxos/ai/AiServiceRouter';
import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

export default (): Capability<any>[] => [
  contributes(
    Capabilities.AiModelResolver,
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
