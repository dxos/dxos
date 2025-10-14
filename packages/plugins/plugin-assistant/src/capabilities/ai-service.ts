//
// Copyright 2023 DXOS.org
//

import { Effect, Layer } from 'effect';

import * as AiServiceRouter from '@dxos/ai/AiServiceRouter';
import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';

export default (context: PluginContext) => {
  const resolvers = context.getCapabilities(Capabilities.AiModelResolver);

  // TODO(dmaretskyi): Extract function to reduce them.
  const combinedLayer = resolvers.reduce(
    (acc, resolver) => resolver.pipe(Layer.provide(acc)),
    AiServiceRouter.AiModelResolver.fromModelMap(Effect.succeed({})), // Empty resolver as fallback.
  );

  return [
    // TODO(dmaretskyi): Read config from settings.
    contributes(
      Capabilities.AiServiceLayer,
      AiServiceRouter.AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer)),
    ),
  ];
};
