//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Layer from 'effect/Layer';

import { AnthropicResolver } from '@dxos/ai/resolvers';
import { Capability, Common } from '@dxos/app-framework';

type EdgeModelResolverCapabilities = Capability.Capability<typeof Common.Capability.AiModelResolver>[];

const edgeModelResolver = Capability.makeModule<[], EdgeModelResolverCapabilities>(() => [
  Capability.contributes(
    Common.Capability.AiModelResolver,
    AnthropicResolver.make().pipe(
      Layer.provide(
        AnthropicClient.layer({
          // TODO(dmaretskyi): Read endpoint from config/settings.
          apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic',
        }),
      ),
      Layer.provide(FetchHttpClient.layer),
    ),
  ),
]);

export default edgeModelResolver;
