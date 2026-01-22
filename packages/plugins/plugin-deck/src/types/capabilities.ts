//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability, type Common } from '@dxos/app-framework';

import { meta } from '../meta';
import { type DeckPluginState, type DeckSettingsProps } from '../types';

export namespace DeckCapabilities {
  export const Settings = Capability.make<Atom.Writable<DeckSettingsProps>>(`${meta.id}/capability/settings`);

  export const State = Capability.make<Common.Capability.StateStore<DeckPluginState>>(`${meta.id}/capability/state`);
}
