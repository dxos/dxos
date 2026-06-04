//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AnthropicResolver } from '@dxos/ai/resolvers';
import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createEdgeIdentity } from '@dxos/client/edge';
import { byokHeaderLayer } from '@dxos/compute';
import { EdgeAiHttpClient, EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';

import { ANTHROPIC_SOURCE } from '../constants';

// Named alias so the module's inferred type stays portable (avoids TS2883 leaking the internal
// `@dxos/ai/AiModelResolver` Layer type into the emitted declarations).
export type EdgeModelResolverCapabilities = Capability.Capability<typeof AppCapabilities.AiModelResolver>[];

// Carry the `Credential.CredentialsService` requirement contributed by `byokHeaderLayer`. The
// LayerSpec graph (space affinity in `ai-service.ts`) supplies `CredentialsService` from the active
// space; consumers that materialize the resolver outside that graph must provide one too.

const edgeModelResolver = Capability.makeModule<[], EdgeModelResolverCapabilities>(
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
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'EDGE services are not configured.');
        const created = new EdgeHttpClient(edgeUrl);
        const updateIdentity = () => {
          if (client.halo.identity.get()) {
            created.setIdentity(createEdgeIdentity(client));
          }
        };
        updateIdentity();
        identitySubscription = client.halo.identity.subscribe(updateIdentity);
        edgeClient = created;
      }
      return edgeClient;
    };

    const anthropicResolverLayer = AnthropicResolver.make().pipe(
      Layer.provide(
        AnthropicClient.layer({
          // Host-only sentinel; `EdgeAiHttpClient` re-bases the request onto the EDGE
          // `/ai/generate/anthropic` route and signs it with the verifiable presentation.
          apiUrl: 'http://edge.internal',
        }).pipe(Layer.provide(EdgeAiHttpClient.layerWithByok(getEdgeClient, byokHeaderLayer(ANTHROPIC_SOURCE)))),
      ),
    );

    const contribution: Capability.Capability<typeof AppCapabilities.AiModelResolver> = Capability.contributes(
      AppCapabilities.AiModelResolver,
      anthropicResolverLayer,
      () => Effect.sync(() => identitySubscription?.unsubscribe()),
    );

    return [contribution];
  }),
);

export default edgeModelResolver;
