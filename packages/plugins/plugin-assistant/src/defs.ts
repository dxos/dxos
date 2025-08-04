//
// Copyright 2025 DXOS.org
//

import { type Layer } from 'effect';

import { type AiService, type AiServiceRouter } from '@dxos/ai';
import { defineCapability, defineEvent } from '@dxos/app-framework';

import { ASSISTANT_PLUGIN } from './meta';

export namespace AssistantCapabilities {
  export type AiServiceLayer = Layer.Layer<AiService>;
  export const AiServiceLayer = defineCapability<AiServiceLayer>(`${ASSISTANT_PLUGIN}/capability/ai-service-factory`);

  /**
   * Plugins can contribute them to provide model resolvers.
   */
  export const AiModelResolver = defineCapability<Layer.Layer<AiServiceRouter.AiModelResolver>>(
    `${ASSISTANT_PLUGIN}/capability/ai-model-resolver`,
  );
}

export namespace AssistantActivationEvents {
  export const AiServiceProvidersReady = defineEvent(`${ASSISTANT_PLUGIN}/event/ai-service-providers-ready`);
}
