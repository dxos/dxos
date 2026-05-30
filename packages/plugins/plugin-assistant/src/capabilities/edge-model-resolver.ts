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
import { EdgeAiHttpClient, EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

// Named alias so the module's inferred type stays portable (avoids TS2883 leaking the internal
// `@dxos/ai/AiModelResolver` Layer type into the emitted declarations).
export type EdgeModelResolverCapabilities = Capability.Capability<typeof AppCapabilities.AiModelResolver>[];

const edgeModelResolver = Capability.makeModule<[], EdgeModelResolverCapabilities>(
  Effect.fnUntraced(function* () {
    const clients = yield* Capability.getAll(ClientCapabilities.Client);
    const hasClientCapability = clients.length > 0;
    const edgeUrlConfigured = hasClientCapability
      ? Boolean(clients[0].config.values.runtime?.services?.edge?.url)
      : false;
    log('edge model resolver activating', { hasClientCapability, edgeUrlConfigured });

    const client = yield* Capability.get(ClientCapabilities.Client);
    const edgeUrl = client.config.values.runtime?.services?.edge?.url;
    if (!edgeUrl) {
      log.warn('EDGE services not configured; skipping edge AI model resolver.');
      return [];
    }

    // Authenticated EDGE client used as the Anthropic backend. The identity is applied
    // reactively so activation does not require an identity to already exist (the resolver
    // is set up before the user has signed in).
    const edgeClient = new EdgeHttpClient(edgeUrl);
    const updateIdentity = () => {
      if (client.halo.identity.get()) {
        edgeClient.setIdentity(createEdgeIdentity(client));
      }
    };
    updateIdentity();
    const subscription = client.halo.identity.subscribe(updateIdentity);

    const contribution: Capability.Capability<typeof AppCapabilities.AiModelResolver> = Capability.contributes(
      AppCapabilities.AiModelResolver,
      AnthropicResolver.make().pipe(
        Layer.provide(
          AnthropicClient.layer({
            // Host-only sentinel; `EdgeAiHttpClient` re-bases the request onto the EDGE
            // `/generate/anthropic` route and signs it with the verifiable presentation.
            apiUrl: 'http://edge',
          }).pipe(Layer.provide(EdgeAiHttpClient.layer(() => edgeClient))),
        ),
      ),
      () => Effect.sync(() => subscription.unsubscribe()),
    );

    return [contribution];
  }),
);

export default edgeModelResolver;
