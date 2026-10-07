//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  presentCollections: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Present collections (experimental)',
      description: 'Enable presenting collections of documents as a slideshow.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
