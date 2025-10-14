//
// Copyright 2025 DXOS.org
//

import { OpenAiClient } from '@effect/ai-openai';
import { FetchHttpClient } from '@effect/platform';
import * as Layer from 'effect/Layer';

import { AiServiceRouter } from '@dxos/ai';
import { Capabilities, type Capability, contributes } from '@dxos/app-framework';

/**
 * To start LM Studio server:
 * ```bash
 * ~/.lmstudio/bin/lms server start --cors
 * ```
 */
export default (): Capability<any>[] => [
  contributes(
    Capabilities.AiModelResolver,
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
