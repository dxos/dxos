//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService, Provider } from '@dxos/ai';
import { ClairicResolver, TypeSafeResolver } from '@dxos/ai/resolvers';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Credential from '@dxos/compute/Credential';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { EdgeAiHttpClient } from '@dxos/edge-client';

import { AssistantOptions } from '#types';

import { makeEdgeAiClient } from '../util/edge-ai-client.ts';

/** Host stripped by {@link EdgeAiHttpClient}; only the request path reaches EDGE. */
const EDGE_SENTINEL_URL = 'http://edge.internal';

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: AssistantOptions.AssistantPluginOptions | void) {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);
    const manager = yield* Capability.Service;
    const edgeAiClient = makeEdgeAiClient(manager);
    yield* Effect.addFinalizer(() => Effect.sync(() => edgeAiClient.dispose()));

    // The terminal fallback serves the keyless models: Cloudflare's decision models (with the default
    // decision model as Clef) and its Clairic extraction model, which EDGE runs on its own Workers AI
    // account. They sit below every contributed resolver, so a plugin that resolves the same models
    // (the TypeSafe plugin's settings) takes precedence.
    const keylessResolver = ClairicResolver.make({
      apiKey: Effect.succeed(undefined),
      endpoint: () => `${EDGE_SENTINEL_URL}/v1/extract`,
    }).pipe(
      Layer.provide(EdgeAiHttpClient.layer(edgeAiClient.get, { service: 'workers-ai/clairic' })),
      Layer.provide(
        TypeSafeResolver.make({
          workersAi: { apiKey: Effect.succeed(undefined), endpoint: () => `${EDGE_SENTINEL_URL}/v1/systemone` },
        }).pipe(
          Layer.provide(EdgeAiHttpClient.layer(edgeAiClient.get, { service: 'workers-ai/typesafe' })),
          Layer.provide(AiModelResolver.fromModelMap({ name: 'Fallback' }, Provider.edge.id, Effect.succeed({}))),
        ),
      ),
    );

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce((acc, resolver) => resolver.pipe(Layer.provide(acc)), keylessResolver);

    let aiServiceLayer: Layer.Layer<AiService.AiService, never, Credential.CredentialsService> =
      AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer));

    const aiServiceMiddleware = options?.aiServiceMiddleware;
    if (aiServiceMiddleware) {
      // Rebuilt rather than mapped in place: reading the service back out of its own layer would
      // add `AiService` to the layer's own requirements.
      aiServiceLayer = Layer.effect(AiService.AiService, Effect.map(AiService.AiService, aiServiceMiddleware)).pipe(
        Layer.provide(aiServiceLayer),
      );
    }

    const aiServiceSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Credential.CredentialsService],
        provides: [AiService.AiService],
      },
      () => aiServiceLayer,
    );

    return Capability.contribute(Capabilities.LayerSpec, aiServiceSpec);
  }),
);
