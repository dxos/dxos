//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework/next';
import { type DeepReadonly } from '@dxos/util';

import { SPACE_PLUGIN } from '../meta';
import { type PluginState } from '../types';

export namespace SpaceCapabilities {
  export const State = defineCapability<DeepReadonly<PluginState>>(`${SPACE_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<PluginState>(`${SPACE_PLUGIN}/capability/state`);
}

// TODO(wittjosiah): Factor out.
export namespace ThreadCapabilities {
  type ThreadCapability<T = any> = {
    predicate: (obj: any) => obj is T;
    createSort: (obj: T) => (anchorA: string | undefined, anchorB: string | undefined) => number;
  };
  export const Thread = defineCapability<ThreadCapability>(`${SPACE_PLUGIN}/capability/thread`);
}
