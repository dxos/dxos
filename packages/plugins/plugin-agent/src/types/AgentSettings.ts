//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  identities: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Create identities for agents',
      description:
        'Give each agent you create its own identity on EDGE and a space it owns, whose editors are its admins. Only they can add the agent to other spaces, and every space it is in shares one brain. Agents created while this is off keep working as before. Needs an EDGE that supports agent identities.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
