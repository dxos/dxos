//
// Copyright 2025 DXOS.org
//

import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { LMStudioResolver } from '@dxos/ai/resolvers';
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
    LMStudioResolver.make().pipe(
      Layer.provide(
        OpenAiClient.layer({
          apiUrl: LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT,
        }),
      ),
      Layer.provide(FetchHttpClient.layer),
    ),
  ),
];
