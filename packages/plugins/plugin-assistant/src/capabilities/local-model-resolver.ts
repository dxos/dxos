//
// Copyright 2025 DXOS.org
//

import { OpenAiClient } from '@effect/ai-openai';
import { FetchHttpClient } from '@effect/platform';
import { Layer } from 'effect';

import { AiServiceRouter } from '@dxos/ai';
import { type Capability, contributes } from '@dxos/app-framework';

import { AssistantCapabilities } from './capabilities';

/**
 * To start LM Studio server:
 * ```bash
 * ~/.lmstudio/bin/lms server start --cors
 * ```
 */
export default (): Capability<any>[] => [
  contributes(
    AssistantCapabilities.AiModelResolver,
    AiServiceRouter.LMStudioResolver.pipe(
      Layer.provide(
        OpenAiClient.layer({
          apiUrl: AiServiceRouter.LMSTUDIO_ENDPOINT,
        }),
      ),
      Layer.provide(FetchHttpClient.layer),
    ),
  ),
];
