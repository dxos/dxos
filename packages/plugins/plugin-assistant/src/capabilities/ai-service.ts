//
// Copyright 2023 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Credential, LayerSpec } from '@dxos/compute';

import type { AssistantPluginOptions } from '#types';

export default Capability.makeModule<AssistantPluginOptions | void, Capability.Any[]>(
  Effect.fnUntraced(function* (options) {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce(
      (acc, resolver) => resolver.pipe(Layer.provide(acc)),
      AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Effect.succeed({})), // Empty resolver as fallback.
    );

    // The combined resolver layer inherits `Credential.CredentialsService` from any BYOK-enabled
    // resolver (e.g. the edge Anthropic resolver wraps its HTTP client with `byokHeaderLayer`). The
    // requirement is satisfied by the space-affinity `CredentialsLayerSpec` in `plugin-client`.
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

    return [Capability.contributes(Capabilities.LayerSpec, aiServiceSpec)];
  }),
);
