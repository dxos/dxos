//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type AIServiceClientImpl } from '@dxos/assistant';

import { AUTOMATION_PLUGIN } from '../meta';

export namespace AutomationCapabilities {
  export const AiClient = defineCapability<AIServiceClientImpl>(`${AUTOMATION_PLUGIN}/capability/ai-client`);
}
