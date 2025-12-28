//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';

export default Capability.makeModule((context) => {
  const resolvers = context.getCapabilities(Capabilities.AiModelResolver);

  // TODO(dmaretskyi): Extract function to reduce them.
  const combinedLayer = resolvers.reduce(
    (acc, resolver) => resolver.pipe(Layer.provide(acc)),
    AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Effect.succeed({})), // Empty resolver as fallback.
  );

  return [
    // TODO(dmaretskyi): Read config from settings.
    Capability.contributes(
      Capabilities.AiServiceLayer,
      AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer)),
    ),
  ];
});
