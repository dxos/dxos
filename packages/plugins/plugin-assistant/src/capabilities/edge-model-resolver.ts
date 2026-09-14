//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AnthropicResolver, ChatCompletionsAdapter, DeepSeekResolver } from '@dxos/ai/resolvers';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Header from '@dxos/compute/Header';
import { EdgeAiHttpClient, EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { ANTHROPIC_SOURCE, DEEPSEEK_SOURCE } from '../constants.ts';

/** Host stripped by {@link EdgeAiHttpClient}; only the request path reaches EDGE. */
const EDGE_SENTINEL_URL = 'http://edge.internal';

const edgeModelResolver = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;

    // The authenticated EDGE client is resolved lazily on the first AI request. AI providers are
    // set up before the Client capability and user identity exist (the startup cascade activates
    // this module before `ClientReady`), so requiring the Client here would throw — or deadlock
    // if we blocked on it. `EdgeAiHttpClient` invokes this thunk per request, by which point the
    // Client is available.
    let edgeClient: EdgeHttpClient | undefined;
    let identitySubscription: { unsubscribe: () => void } | undefined;
    const getEdgeClient = (): EdgeHttpClient => {
      if (!edgeClient) {
        const [client] = manager.getAll(ClientCapabilities.Client);
        invariant(client, 'Client capability is required for edge AI requests.');
        const [haloIdentity] = manager.getAll(ClientCapabilities.IdentityService);
        invariant(haloIdentity, 'HALO identity capability is required for edge AI requests.');
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'EDGE services are not configured.');
        const created = new EdgeHttpClient(edgeUrl);
        const updateIdentity = () => {
          const edgeIdentity = haloIdentity.getEdgeIdentity();
          if (Option.isSome(edgeIdentity)) {
            created.setIdentity(edgeIdentity.value);
          }
        };
        updateIdentity();
        identitySubscription = { unsubscribe: haloIdentity.subscribe(updateIdentity) };
        edgeClient = created;
      }
      return edgeClient;
    };

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

    yield* Effect.addFinalizer(() => Effect.sync(() => identitySubscription?.unsubscribe()));
    return Capability.contributeAll(AppCapabilities.AiModelResolver, [anthropicResolverLayer, deepSeekResolverLayer]);
  }),
);

export default edgeModelResolver;
