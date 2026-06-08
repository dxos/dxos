//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    /** Whether to show the welcome page on the personal space home. Backed by WelcomeDismissedAnnotation. */
    showWelcome: Schema.optional(Schema.Boolean),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
