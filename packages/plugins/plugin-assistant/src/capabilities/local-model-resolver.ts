//
// Copyright 2025 DXOS.org
//

import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { LMStudioResolver } from '@dxos/ai/resolvers';
import { Capabilities, type Capability, contributes, defineCapabilityModule } from '@dxos/app-framework';

type LocalModelResolverCapabilities = Capability<typeof Capabilities.AiModelResolver>[];

/**
 * To start LM Studio server:
 * ```bash
 * ~/.lmstudio/bin/lms server start --cors
 * ```
 */
const localModelResolver = defineCapabilityModule<[], LocalModelResolverCapabilities>(() => [
  contributes(
    Capabilities.AiModelResolver,
    LMStudioResolver.make().pipe(
      Layer.provide(
        OpenAiClient.layer({
          apiUrl: LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT,
        }),
      ),
      Layer.provide(FetchHttpClient.layer),
    ),
  ),
]);

export default localModelResolver;
