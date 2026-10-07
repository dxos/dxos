//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  paymentsUrl: Schema.optional(
    Schema.String.annotate({
      title: 'Payments service URL',
      description: 'Base URL of the payments-service (No trailing slash).',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
