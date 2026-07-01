//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    paymentsUrl: Schema.optional(
      Schema.String.annotations({
        title: 'Payments service URL',
        description: 'Base URL of the payments-service (e.g. https://payments.example.com). No trailing slash.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
