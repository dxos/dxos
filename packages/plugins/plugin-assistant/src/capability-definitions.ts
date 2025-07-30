import { Layer } from 'effect';
import { AiService } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';
import { ASSISTANT_PLUGIN } from './meta';

export namespace AssistantCapabilities {
  export type AiServiceLayer = Layer.Layer<AiService>;
  export const AiServiceLayer = defineCapability<AiServiceLayer>(`${ASSISTANT_PLUGIN}/capability/ai-service-factory`);
}
