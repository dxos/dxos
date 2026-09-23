//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  /**
   * Calls System One directly at this base URL (e.g. `https://api.typesafe.ai/v1`) instead of
   * through EDGE — for a self-hosted or regional endpoint that sends CORS headers. Unset routes
   * through EDGE, which also works without a connected key.
   */
  apiUrl: Schema.optional(
    Schema.String.annotate({
      title: 'API base URL',
      description: 'System One endpoint override.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({});
