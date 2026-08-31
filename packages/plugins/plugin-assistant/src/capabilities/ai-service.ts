//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService, Provider } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Credential from '@dxos/compute/Credential';
import * as LayerSpec from '@dxos/compute/LayerSpec';

import { AssistantOptions } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (options: AssistantOptions.AssistantPluginOptions | void) {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);
    const middlewares = yield* Capability.getAll(AppCapabilities.AiServiceMiddleware);

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce(
      (acc, resolver) => resolver.pipe(Layer.provide(acc)),
      // Empty resolver as the terminal fallback (provider is irrelevant — the map is empty).
      AiModelResolver.fromModelMap({ name: 'Fallback' }, Provider.edge.id, Effect.succeed({})),
    );

    const baseLayer: Layer.Layer<AiService.AiService, never, Credential.CredentialsService> =
      AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer));

    const aiServiceSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Credential.CredentialsService],
        provides: [AiService.AiService],
      },
      (context) => {
        const aiServiceMiddleware = options?.aiServiceMiddleware;
        if (!aiServiceMiddleware && middlewares.length === 0) {
          return baseLayer;
        }
        const decorate = (service: AiService.Service): AiService.Service =>
          middlewares.reduce(
            (acc, middleware) => middleware(acc, { space: context.space }),
            aiServiceMiddleware ? aiServiceMiddleware(service) : service,
          );
        // Rebuilt rather than mapped in place: reading the service back out of its own layer would
        // add `AiService` to the layer's own requirements.
        return Layer.effect(AiService.AiService, Effect.map(AiService.AiService, decorate)).pipe(
          Layer.provide(baseLayer),
        );
      },
    );

    return Capability.contribute(Capabilities.LayerSpec, aiServiceSpec);
  }),
);
