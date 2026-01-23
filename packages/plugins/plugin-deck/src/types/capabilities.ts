//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';
import { type DeckPluginState } from '../types';

export namespace DeckCapabilities {
  export const DeckState = Capability.make<DeepReadonly<DeckPluginState>>(`${meta.id}/capability/state`);
  export const MutableDeckState = Capability.make<DeckPluginState>(`${meta.id}/capability/state`);
}
