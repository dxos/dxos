//
// Copyright 2023 DXOS.org
//

import { Effect, Layer } from 'effect';

import { AiServiceRouter } from '@dxos/ai';
import { type Capability, type InterfaceDef, type PluginContext, contributes } from '@dxos/app-framework';

import { AssistantCapabilities } from './capabilities';

export default (context: PluginContext) => {
  const resolvers = context.getCapabilities(AssistantCapabilities.AiModelResolver);

  // TODO(dmaretskyi): Extract function to reduce them.
  const combinedLayer = resolvers.reduce(
    (acc, resolver) => resolver.pipe(Layer.provide(acc)),
    AiServiceRouter.AiModelResolver.fromModelMap(Effect.succeed({})), // Empty resolver as fallback.
  );

  return [
    // TODO(dmaretskyi): Read config from settings.
    contributes(
      AssistantCapabilities.AiServiceLayer,
      AiServiceRouter.AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer)),
    ),
  ];
};
