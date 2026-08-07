//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  showHidden: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show hidden types',
      description: 'Include types annotated as hidden (e.g. Tag, View, Feed) in the database section.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
