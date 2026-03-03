//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AttentionManager, type SelectionManager } from '@dxos/react-ui-attention';

import { meta } from '../meta';

export namespace AttentionCapabilities {
  export const Attention = Capability.make<AttentionManager>(`${meta.id}/capability/attention`);
  export const Selection = Capability.make<SelectionManager>(`${meta.id}/capability/selection`);
}
