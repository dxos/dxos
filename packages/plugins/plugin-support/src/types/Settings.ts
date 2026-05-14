//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    showWelcome: Schema.Boolean.annotations({
      title: 'Show welcome article',
      description: 'Display the Welcome surface at the top of the personal space.',
    }),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
