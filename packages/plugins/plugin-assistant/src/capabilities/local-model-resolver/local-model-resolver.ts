//
// Copyright 2025 DXOS.org
//

import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { LMStudioResolver } from '@dxos/ai/resolvers';
import { Capability, Common } from '@dxos/app-framework';

export type LocalModelResolverCapabilities = [Capability.Capability<typeof Common.Capability.AiModelResolver>];

/**
 * To start LM Studio server:
 * ```bash
 * ~/.lmstudio/bin/lms server start --cors
 * ```
 */
const localModelResolver = Capability.makeModule<[], LocalModelResolverCapabilities>(() =>
  Effect.succeed([
    Capability.contributes(
      Common.Capability.AiModelResolver,
      LMStudioResolver.make().pipe(
        Layer.provide(
          OpenAiClient.layer({
            apiUrl: LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT,
          }),
        ),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
  ]),
);

export default localModelResolver;
