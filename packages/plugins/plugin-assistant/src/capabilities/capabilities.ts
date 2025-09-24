//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';
import { type Assistant } from '../types';

export namespace AssistantCapabilities {
  export type AssistantState = {
    /** Map of primary object fq id to current chat. */
    currentChat: Record<string, Assistant.Chat>;
  };
  export const State = defineCapability<DeepReadonly<AssistantState>>(`${meta.id}/capability/state`);
  export const MutableState = defineCapability<AssistantState>(`${meta.id}/capability/state`);
}
