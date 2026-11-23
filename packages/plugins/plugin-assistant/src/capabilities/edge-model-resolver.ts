//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AnthropicResolver, ChatCompletionsAdapter, DeepSeekResolver } from '@dxos/ai/resolvers';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Header from '@dxos/compute/Header';
import { EdgeAiHttpClient } from '@dxos/edge-client';

import { ANTHROPIC_SOURCE, DEEPSEEK_SOURCE } from '../constants.ts';
import { makeEdgeAiClient } from '../util/edge-ai-client.ts';

/** Host stripped by {@link EdgeAiHttpClient}; only the request path reaches EDGE. */
const EDGE_SENTINEL_URL = 'http://edge.internal';

const edgeModelResolver = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;

    const edgeAiClient = makeEdgeAiClient(manager);
    const getEdgeClient = edgeAiClient.get;

    // `apiUrl`/`baseUrl` are sentinels; `EdgeAiHttpClient` rewrites the request onto the EDGE
    // `/ai/generate/<service>` route. `Header.byokLayer` wraps that client to inject `X-BYOK`.
    const anthropicHttpClient = Header.byokLayer(ANTHROPIC_SOURCE).pipe(
      Layer.provide(EdgeAiHttpClient.layer(getEdgeClient, { service: 'anthropic' })),
    );
    const anthropicClient = AnthropicClient.layer({ apiUrl: EDGE_SENTINEL_URL }).pipe(
      Layer.provide(anthropicHttpClient),
    );
    const anthropicResolverLayer = AnthropicResolver.make().pipe(Layer.provide(anthropicClient));

    const deepSeekHttpClient = Header.byokLayer(DEEPSEEK_SOURCE).pipe(
      Layer.provide(EdgeAiHttpClient.layer(getEdgeClient, { service: 'deepseek' })),
    );
    const deepSeekClient = ChatCompletionsAdapter.clientLayer({
      baseUrl: EDGE_SENTINEL_URL,
      apiFormat: 'openai',
      provider: 'deepseek',
      // DeepSeek reports token usage on a streamed response only when asked; without it every
      // streamed request reaches the EDGE proxy's metering with no usage to commit.
      streamUsage: true,
    }).pipe(Layer.provide(deepSeekHttpClient));
    const deepSeekResolverLayer = DeepSeekResolver.make().pipe(Layer.provide(deepSeekClient));

    yield* Effect.addFinalizer(() => Effect.sync(() => edgeAiClient.dispose()));
    return Capability.contributeAll(AppCapabilities.AiModelResolver, [anthropicResolverLayer, deepSeekResolverLayer]);
  }),
);

export default edgeModelResolver;
