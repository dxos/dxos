//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  showDiscordCompanion: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show Discord community panel',
      description: 'Show the Discord community tab in the sidebar.',
    }),
  ),
});

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
