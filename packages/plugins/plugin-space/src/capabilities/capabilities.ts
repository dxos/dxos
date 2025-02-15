//
// Copyright 2025 DXOS.org
//

import { defineCapability, Label } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import { type PluginState } from '../types';

export namespace SpaceCapabilities {
  export const State = defineCapability<DeepReadonly<PluginState>>(`${SPACE_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<PluginState>(`${SPACE_PLUGIN}/capability/state`);

  export type SpaceSettingsPanel = { id: string; label: Label };
  export const SettingsPanel = defineCapability<SpaceSettingsPanel>(`${SPACE_PLUGIN}/capability/settings-panel`);
}

// TODO(wittjosiah): Factor out.
export namespace ThreadCapabilities {
  type ThreadCapability<T = any> = {
    predicate: (obj: any) => obj is T;
    createSort: (obj: T) => (anchorA: string | undefined, anchorB: string | undefined) => number;
  };
  export const Thread = defineCapability<ThreadCapability>(`${SPACE_PLUGIN}/capability/thread`);
}
