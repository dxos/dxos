//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
// Aliased: unwrapping the enclosing `namespace` put these in the same scope as the capabilities named after them.
import { type Attention as Attention$, type ViewState as ViewState$ } from '@dxos/react-ui-attention/types';

import { meta } from '#meta';

export const Attention = Capability.makeSingleton<Attention$.AttentionManager>()(
  `${meta.profile.key}.capability.attention`,
);
export const ViewState = Capability.makeSingleton<ViewState$.Manager>()(`${meta.profile.key}.capability.viewState`);
