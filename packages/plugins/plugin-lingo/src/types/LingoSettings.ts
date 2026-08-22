//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Format } from '@dxos/echo';

import * as Language from './Language';

export const Settings = Schema.Struct({
  /**
   * Language the reader opens on. Without it the selector fell back to whichever language sorted
   * first by name — Arabic — for every learner, since the list is sorted for reading, not ranked.
   */
  language: Schema.optional(
    Schema.String.annotate({
      title: 'Language',
      description: 'The language the reader companion translates into by default.',
      // BCP-47 codes rather than names: the annotation carries bare values, so the select renders
      // whatever is stored. Labelled options are a form-layer gap, tracked separately.
    }).pipe(Format.OptionsAnnotation.set([...Language.POPULAR].map(({ code }) => code).sort())),
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

export const defaults = (): Settings => ({
  language: Language.DEFAULT_BASE_CODE,
  highlightKnownWords: true,
  translateUnknownWords: true,
});
