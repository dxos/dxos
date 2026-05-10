//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.Struct({
  enableDeck: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Enable Deck',
      description: 'Display multiple panels side by side instead of one at a time.',
    }),
  ),
  // TODO(burdon): Rename layoutMode? (e.g., bento | encapsulated?)
  encapsulatedPlanks: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Encapsulated planks',
      description: 'Render each plank inside its own isolated container.',
    }),
  ),
  enableStatusbar: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Show status bar',
      description: 'Display a status bar at the bottom of the application.',
    }),
  ),
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
