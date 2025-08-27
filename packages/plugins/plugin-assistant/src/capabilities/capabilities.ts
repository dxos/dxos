//
// Copyright 2025 DXOS.org
//

import { type Layer } from 'effect';

import { type AiService, type AiServiceRouter } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';
import { type Assistant } from '../types';

export namespace AssistantCapabilities {
  export type AssistantState = {
    /** Map of primary object fq id to current chat. */
    currentChat: Record<string, Assistant.Chat>;
  };
  export const State = defineCapability<DeepReadonly<AssistantState>>(`${meta.id}/capability/state`);
  export const MutableState = defineCapability<AssistantState>(`${meta.id}/capability/state`);

  export type AiServiceLayer = Layer.Layer<AiService.AiService>;
  export const AiServiceLayer = defineCapability<AiServiceLayer>(`${meta.id}/capability/ai-service-factory`);

  /**
   * Plugins can contribute them to provide model resolvers.
   */
  export const AiModelResolver = defineCapability<Layer.Layer<AiServiceRouter.AiModelResolver>>(
    `${meta.id}/capability/ai-model-resolver`,
  );
}
