//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** The projects plugin's user preferences. */
export const Settings = Schema.Struct({
  showTaskDescriptions: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show task descriptions',
      description: "Display each task's description beneath its title in a project's task list.",
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
