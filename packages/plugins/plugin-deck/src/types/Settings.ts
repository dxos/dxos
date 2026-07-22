//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  showHints: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Show hints',
      description: 'Show helpful tips and keyboard shortcut hints in the interface.',
    }),
  ),
  enableNativeRedirect: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Enable native url redirect',
      description: 'Redirect supported URLs to the native desktop application.',
    }),
  ),
}).pipe(Schema.mutable);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
