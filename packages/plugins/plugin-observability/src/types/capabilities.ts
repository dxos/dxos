//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type Observability } from '@dxos/observability';

import { meta } from '../meta';

export namespace ObservabilityCapabilities {
  export type State = {
    group?: string;
    notified?: boolean;
  };
  export const State = Capability.make<State>(`${meta.id}/capability/state`);

  export const Observability = Capability.make<Observability>(`${meta.id}/capability/observability`);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
// TODO(burdon): Figure out how to share defs.
export const ClientCapability = Capability.make<Client>('dxos.org/plugin/client/capability/client');
