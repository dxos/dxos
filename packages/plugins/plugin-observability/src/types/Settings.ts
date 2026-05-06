//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    enabled: Schema.Boolean.annotations({
      title: 'Enable telemetry',
      description: 'Send anonymous usage and performance data to help improve the product.',
    }),
    // TODO(wittjosiah): Separate settings for each observability feature.
    // metrics?: boolean;
    // telemetry?: boolean;
    // errors?: boolean;
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
