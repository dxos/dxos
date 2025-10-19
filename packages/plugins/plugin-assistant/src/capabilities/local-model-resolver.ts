//
// Copyright 2025 DXOS.org
//

import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import * as AiServiceRouter from '@dxos/ai/AiServiceRouter';
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
