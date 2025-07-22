//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal } from '@preact/signals-core';

import { type AiServiceClient } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';

import { meta } from '../meta';

export namespace AssistantCapabilities {
  export const AiClient = defineCapability<ReadonlySignal<AiServiceClient>>(`${meta.id}/capability/ai-client`);
}
