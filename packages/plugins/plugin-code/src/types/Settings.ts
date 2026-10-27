//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  endpoint: Schema.optional(
    Schema.String.annotate({
      title: 'Build service endpoint',
      description: 'URL of the EDGE build service. Leave empty to use the default.',
    }),
  ),
  repos: Schema.optional(
    Schema.Array(Schema.String).annotate({
      title: 'Local repositories',
      description:
        'Checkouts that synced specs resolve against: an absolute path (its GitHub remote names the repo), or `owner/repo=/abs/path`.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
