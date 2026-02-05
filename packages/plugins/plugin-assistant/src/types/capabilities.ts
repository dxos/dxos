//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { type Assistant } from './';

export namespace AssistantCapabilities {
  export const Settings = Capability.make<Atom.Writable<Assistant.Settings>>(`${meta.id}/capability/settings`);

  export const StateSchema = Schema.mutable(
    Schema.Struct({
      /** Map of primary object dxn to current chat dxn. */
      currentChat: Schema.Record({ key: Schema.String, value: Schema.UndefinedOr(Schema.String) }),
    }),
  );

  export type AssistantState = Schema.Schema.Type<typeof StateSchema>;

  export const State = Capability.make<Atom.Writable<AssistantState>>(`${meta.id}/capability/state`);
}
