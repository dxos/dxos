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

  //
  // Layout experiments. Each is off by default and independent of the others, so a shape can be tried
  // without committing to it; drop the flag once one is settled rather than leaving it as a permanent
  // preference.
  //
  overscroll: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Scroll past the last plank',
      description:
        'Let the deck keep scrolling once the last plank reaches the right edge, so it can be brought to the front like any other plank — the one before it collapses to a spine, leaving empty space beside it.',
    }),
  ),
}).pipe(Schema.mutable);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
