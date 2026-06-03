//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { Context } from 'effect';

import { AiModelResolver, AiService } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { LayerSpec } from '@dxos/compute';

import type { AssistantPluginOptions } from '#types';

export default Capability.makeModule<AssistantPluginOptions | void>(
  Effect.fnUntraced(function* (options) {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce(
      (acc, resolver) => resolver.pipe(Layer.provide(acc)),
      AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Effect.succeed({})), // Empty resolver as fallback.
    );

    let aiServiceLayer: Layer.Layer<AiService.AiService> = AiModelResolver.AiModelResolver.buildAiService.pipe(
      Layer.provide(combinedLayer),
    );

    if (options?.aiServiceMiddleware) {
      aiServiceLayer = aiServiceLayer.pipe(
        Layer.map((context) => {
          const aiService = Context.get(context, AiService.AiService);
          return Context.make(AiService.AiService, options.aiServiceMiddleware!(aiService));
        }),
      );
    }

    const aiServiceSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [AiService.AiService],
      },
      () => aiServiceLayer,
    );

    return [
      // Deprecated: `AppCapabilities.AiServiceLayer` is retained for non-process-manager
      // call sites (e.g. legacy CLI paths). New consumers should resolve `AiService.AiService`
      // through the process manager runtime via the `LayerSpec` contribution below.
      Capability.contributes(AppCapabilities.AiServiceLayer, aiServiceLayer),
      Capability.contributes(Capabilities.LayerSpec, aiServiceSpec),
    ];
  }),
);
