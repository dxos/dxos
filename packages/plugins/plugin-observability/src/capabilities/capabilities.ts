//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type Observability } from '@dxos/observability';

import { meta } from '../meta';

export namespace ObservabilityCapabilities {
  export type State = {
    group?: string;
    notified?: boolean;
  };
  export const State = defineCapability<State>(`${meta.id}/capability/state`);

  export const Observability = defineCapability<Observability>(`${meta.id}/capability/observability`);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
// TODO(burdon): Figure out how to share defs.
export const ClientCapability = defineCapability<Client>('dxos.org/plugin/client/capability/client');
