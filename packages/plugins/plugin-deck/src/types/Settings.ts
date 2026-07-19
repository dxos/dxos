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
  // TODO(burdon): Rename layoutMode? (e.g., bento/encapsulated or floating/compact, etc.)
  encapsulatedPlanks: Schema.optional(
    Schema.Boolean.annotations({
      title: 'Encapsulated planks',
      description: 'Render each plank inside its own isolated container.',
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
  navigationDefault: Schema.optional(
    Schema.Literal('replace', 'new-plank').annotations({
      title: 'Navigation behavior',
      description:
        'Whether opening an item replaces the current panel or opens it in a new panel beside it. Shift-click does the opposite.',
    }),
  ),
}).pipe(Schema.mutable);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
