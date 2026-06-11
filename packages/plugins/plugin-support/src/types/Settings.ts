//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  enableGitHubIssues: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Enable GitHub issue submission',
      description: 'Show the "Create GitHub Issue" button in the feedback panel.',
    }),
  ),
});

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
