//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type Observability } from '@dxos/observability';

import { type ObservabilitySettingsProps } from '../components';
import { meta } from '../meta';

export namespace ObservabilityCapabilities {
  export const Settings = Capability.make<Atom.Writable<ObservabilitySettingsProps>>(`${meta.id}/capability/settings`);

  export const StateSchema = Schema.mutable(
    Schema.Struct({
      group: Schema.optional(Schema.String),
      notified: Schema.optional(Schema.Boolean),
    }),
  );

  export type State = Schema.Schema.Type<typeof StateSchema>;

  export const State = Capability.make<Atom.Writable<State>>(`${meta.id}/capability/state`);

  export const Observability = Capability.make<Observability.Observability>(`${meta.id}/capability/observability`);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
// TODO(burdon): Figure out how to share defs.
export const ClientCapability = Capability.make<Client>('dxos.org/plugin/client/capability/client');
