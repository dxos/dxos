//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

export const DebugSettingsSchema = Schema.mutable(
  Schema.Struct({
    wireframe: Schema.optional(Schema.Boolean),
  }),
);

export interface DebugSettingsProps extends Schema.Schema.Type<typeof DebugSettingsSchema> {}

export namespace DebugCapabilities {
  export const Settings = Capability.make<Atom.Writable<DebugSettingsProps>>(`${meta.id}.capability.settings`);
}
