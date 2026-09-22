//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  hideHelpCompanions: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Hide help panels',
      description: 'Hide the help companion beside open items and on each space home.',
    }),
  ),
  showDiscordCompanion: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Show Discord community panel',
      description: 'Show the Discord community tab in the sidebar.',
    }),
  ),
});

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
