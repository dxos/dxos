//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AttentionManager, ViewState } from '@dxos/react-ui-attention';

import { meta } from '#meta';

export namespace AttentionCapabilities {
  export const Attention = Capability.make<AttentionManager>(`${meta.profile.key}.capability.attention`);
  export const ViewState = Capability.make<ViewState.ViewStateManager>(`${meta.profile.key}.capability.view-state`);
}
