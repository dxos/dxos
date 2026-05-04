//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    presentCollections: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Present collections (experimental)',
        description: 'Enable presenting collections of documents as a slideshow.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
