//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type AttentionManager, type SelectionManager } from '@dxos/react-ui-attention';

import { ATTENTION_PLUGIN } from '../meta';

export namespace AttentionCapabilities {
  export const Attention = defineCapability<AttentionManager>(`${ATTENTION_PLUGIN}/capability/attention`);
  export const Selection = defineCapability<SelectionManager>(`${ATTENTION_PLUGIN}/capability/selection`);
}
