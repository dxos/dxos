//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/**
 * How the reader companion renders the text it is bound to.
 * - `original`: the source text, with known vocabulary underlined and translated on hover.
 * - `translation`: known vocabulary replaced inline by its translation.
 * - `split`: both panes side by side, scroll-linked.
 */
export const RevealMode = Schema.Literals(['original', 'translation', 'split']);
export type RevealMode = Schema.Schema.Type<typeof RevealMode>;

export const Settings = Schema.Struct({
  revealMode: RevealMode.annotate({
    title: 'Reader mode',
    description: 'How the reader companion opens: original text, inline translation, or split view.',
  }),
  highlightKnownWords: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Highlight vocabulary',
      description: 'Underline words that are already in a vocabulary deck.',
    }),
  ),
  translateUnknownWords: Schema.optional(
    Schema.Boolean.annotate({
      title: 'Translate unknown words',
      description: 'Ask the assistant to translate a word on hover when no deck contains it.',
    }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({
  revealMode: 'original',
  highlightKnownWords: true,
  translateUnknownWords: true,
});
