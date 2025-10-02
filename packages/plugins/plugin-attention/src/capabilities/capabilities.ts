//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type AttentionManager, type SelectionManager } from '@dxos/react-ui-attention';

import { meta } from '../meta';

export namespace AttentionCapabilities {
  export const Attention = defineCapability<AttentionManager>(`${meta.id}/capability/attention`);
  export const Selection = defineCapability<SelectionManager>(`${meta.id}/capability/selection`);
}
