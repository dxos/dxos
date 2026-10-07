//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Language from './Language.ts';

/** Codes offered by the settings select, sorted so the list reads the same as the reader's. */
const LANGUAGE_CODES = [...Language.POPULAR].map(({ code }) => code).sort();

export const Settings = Schema.Struct({
  /**
   * Language the reader opens on. Without it the selector fell back to whichever language sorted
   * first by name — Arabic — for every learner, since the list is sorted for reading, not ranked.
   */
  language: Schema.optional(
    // A literal union rather than a string carrying `Format.OptionsAnnotation`: the form picks its
    // renderer by type first, so an annotated string is a text box and only a union becomes a select.
    // The options are BCP-47 codes, since the annotation carries bare values with no label channel.
    Schema.Literals(LANGUAGE_CODES).annotate({
      title: 'Language',
      description: 'The language the reader companion translates into by default.',
    }),
  ),
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

/** Reader defaults: help on, and translations in the base language until the user picks another. */
export const defaults = (): Settings => ({
  language: Language.DEFAULT_BASE_CODE,
  highlightKnownWords: true,
  translateUnknownWords: true,
});
