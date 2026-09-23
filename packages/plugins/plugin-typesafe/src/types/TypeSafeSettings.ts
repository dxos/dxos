//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  /**
   * Calls System One directly at this URL instead of through EDGE — for a self-hosted or regional
   * endpoint reachable from the browser. Unset routes through EDGE, which also works without a
   * connected key.
   */
  endpoint: Schema.optional(
    Schema.String.annotate({
      title: 'API endpoint',
      description: 'Direct System One endpoint. Leave empty to route through EDGE.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({});
