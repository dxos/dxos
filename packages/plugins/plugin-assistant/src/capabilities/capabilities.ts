//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal } from '@preact/signals-core';

import { type AIServiceClient } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';

import { ASSISTANT_PLUGIN } from '../meta';

export namespace AssistantCapabilities {
  export const AiClient = defineCapability<ReadonlySignal<AIServiceClient>>(`${ASSISTANT_PLUGIN}/capability/ai-client`);
}
