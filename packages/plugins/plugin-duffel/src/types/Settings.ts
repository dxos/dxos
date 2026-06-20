//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    apiKey: Schema.optional(
      Schema.String.annotations({
        title: 'API key',
        description: 'Duffel API access token (test or live).',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
