//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  enabled: Schema.Boolean.annotate({
    title: 'Enable telemetry',
    description: 'Send anonymous usage and performance data to help improve the product.',
  }),
  // TODO(wittjosiah): Separate settings for each observability feature.
  // metrics?: boolean;
  // telemetry?: boolean;
  // errors?: boolean;
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
