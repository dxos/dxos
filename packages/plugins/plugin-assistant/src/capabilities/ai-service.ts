//
// Copyright 2023 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService, Provider } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Credential, LayerSpec } from '@dxos/compute';

import type { AssistantPluginOptions } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: AssistantPluginOptions | void) {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce(
      (acc, resolver) => resolver.pipe(Layer.provide(acc)),
      // Empty resolver as the terminal fallback (provider is irrelevant — the map is empty).
      AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Provider.edge.id, Effect.succeed({})),
    );

    let aiServiceLayer: Layer.Layer<AiService.AiService, never, Credential.CredentialsService> =
      AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer));

    const aiServiceMiddleware = options?.aiServiceMiddleware;
    if (aiServiceMiddleware) {
      aiServiceLayer = aiServiceLayer.pipe(
        Layer.map((context) => {
          const aiService = Context.get(context, AiService.AiService);
          return Context.make(AiService.AiService, aiServiceMiddleware(aiService));
        }),
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

    return Capability.provide(Capabilities.LayerSpec, aiServiceSpec);
  }),
);
