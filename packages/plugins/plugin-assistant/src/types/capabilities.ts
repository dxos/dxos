//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';

export namespace AssistantCapabilities {
  export type AssistantState = {
    /** Map of primary object dxn to current chat dxn. */
    currentChat: Record<string, string | undefined>;
  };
  export const State = Capability.make<DeepReadonly<AssistantState>>(`${meta.id}/capability/state`);
  export const MutableState = Capability.make<AssistantState>(`${meta.id}/capability/state`);
}
