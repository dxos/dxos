//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { DescriptionAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { CardAnnotation, CollectionItemAnnotation } from '@dxos/schema';

import * as Language from './Language';

/**
 * A named deck of words for one language ("Chapter 3", "News vocabulary", …).
 *
 * The deck holds no word list: membership lives on the word's `vocabulary` ref, so appending a
 * word from an extraction is one write and the deck view is an ordinary reactive query.
 */
export class Vocabulary extends Type.makeObject<Vocabulary>(DXN.make('org.dxos.type.lingo.vocabulary', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Name' }))),
    description: Schema.optional(Schema.String),
    language: Ref.Ref(Language.Language).pipe(Schema.annotate({ title: 'Language' })),
  }).pipe(
    LabelAnnotation.set(['name']),
    DescriptionAnnotation.set('description'),
    Annotation.IconAnnotation.set({ icon: 'ph--cards--regular', hue: 'teal' }),
    CardAnnotation.set(true),
    CollectionItemAnnotation.set(true),
  ),
) {}

/** Form schema for the create-object dialog. */
export const CreateVocabularySchema = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Name' }))),
  language: Ref.Ref(Language.Language).pipe(Schema.annotate({ title: 'Language' })),
});
export interface CreateVocabularySchema extends Schema.Schema.Type<typeof CreateVocabularySchema> {}

/** Creates a Vocabulary deck. */
export const make = (props: Obj.MakeProps<typeof Vocabulary>): Vocabulary => Obj.make(Vocabulary, props);

/** Checks if a value is a Vocabulary object. */
export const instanceOf = (value: unknown): value is Vocabulary => Obj.instanceOf(Vocabulary, value);
