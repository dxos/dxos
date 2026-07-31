//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type Attention, type ViewState } from '@dxos/react-ui-attention/types';

import { meta } from '#meta';

export namespace AttentionCapabilities {
  export const Attention = Capability.makeSingleton<Attention.AttentionManager>()(
    `${meta.profile.key}.capability.attention`,
  );
  export const ViewState = Capability.makeSingleton<ViewState.Manager>()(`${meta.profile.key}.capability.viewState`);
}
