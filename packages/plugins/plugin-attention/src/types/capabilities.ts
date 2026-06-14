//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AttentionManager, type ViewStateManager } from '@dxos/react-ui-attention';

import { meta } from '#meta';

export namespace AttentionCapabilities {
  export const Attention = Capability.make<AttentionManager>(`${meta.id}.capability.attention`);
  export const ViewState = Capability.make<ViewStateManager>(`${meta.id}.capability.view-state`);
}
