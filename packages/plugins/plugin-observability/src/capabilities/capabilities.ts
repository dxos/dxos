//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type Observability } from '@dxos/observability';

import { OBSERVABILITY_PLUGIN } from '../meta';

export namespace ObservabilityCapabilities {
  export type State = {
    group?: string;
    notified?: boolean;
  };
  export const State = defineCapability<State>(`${OBSERVABILITY_PLUGIN}/capability/state`);

  export const Observability = defineCapability<Observability>(`${OBSERVABILITY_PLUGIN}/capability/observability`);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
export const ClientCapability = defineCapability<Client>('dxos.org/plugin/client/capability/client');
