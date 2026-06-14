//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    /** Show the time-travel history scrubber companion on supported objects. */
    enableHistory: Schema.optional(Schema.Boolean.annotations({ title: 'Show object history scrubber' })),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
