//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    /** Show the branches companion (history scrubber + branch list) on supported objects. */
    enableBranches: Schema.optional(Schema.Boolean.annotations({ title: 'Show object branches' })),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
