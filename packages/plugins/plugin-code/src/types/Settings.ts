//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    endpoint: Schema.optional(
      Schema.String.annotations({
        title: 'Build service endpoint',
        description: 'URL of the EDGE build service. Leave empty to use the default.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
