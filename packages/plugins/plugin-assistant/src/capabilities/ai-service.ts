//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { LayerSpec } from '@dxos/functions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce(
      (acc, resolver) => resolver.pipe(Layer.provide(acc)),
      AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Effect.succeed({})), // Empty resolver as fallback.
    );

    const aiServiceLayer: Layer.Layer<AiService.AiService> = AiModelResolver.AiModelResolver.buildAiService.pipe(
      Layer.provide(combinedLayer),
    );

    const aiServiceSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [AiService.AiService],
      },
      () => aiServiceLayer,
    );

    return [
      // Keep the original `AiServiceLayer` contribution for consumers that still read it
      // directly (e.g. CLI / non-process-manager code paths).
      Capability.contributes(AppCapabilities.AiServiceLayer, aiServiceLayer),
      Capability.contributes(Capabilities.LayerSpec, aiServiceSpec),
    ];
  }),
);
