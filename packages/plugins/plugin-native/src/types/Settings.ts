//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    spotlightShortcut: Schema.optional(Schema.String),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
