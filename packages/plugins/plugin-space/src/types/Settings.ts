//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    showHidden: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show hidden types',
        description: 'Include types annotated as hidden (e.g. Tag, View, Feed) in the database section.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
