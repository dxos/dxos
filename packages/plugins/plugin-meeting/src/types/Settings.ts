//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    entityExtraction: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Entity extraction',
        description:
          'While transcribing, use the Assistant to detect and annotate mentions of known objects such as people or organizations.',
      }),
    ).pipe(Schema.withConstructorDefault(() => true)),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
