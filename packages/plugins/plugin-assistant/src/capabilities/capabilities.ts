//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal } from '@preact/signals-core';

import { type AiServiceClient } from '@dxos/ai';
import { defineCapability } from '@dxos/app-framework';

import { ASSISTANT_PLUGIN } from '../meta';

// TODO(burdon): Move to types to import from other plugins?
export namespace AssistantCapabilities {
  export const AiClient = defineCapability<ReadonlySignal<AiServiceClient>>(`${ASSISTANT_PLUGIN}/capability/ai-client`);
}
