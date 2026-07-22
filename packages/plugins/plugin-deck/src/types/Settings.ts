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
  flatten: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Flatten deck',
      description:
        'Show one plank at a time with your navigation history as breadcrumbs in the heading, instead of a scrolling deck of open planks.',
    }),
  ),
}).pipe(Schema.mutable);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
