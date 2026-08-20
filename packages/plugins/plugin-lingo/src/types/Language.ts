//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { DescriptionAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

/**
 * CEFR proficiency band. Advisory only: it tunes how much help the reader shows (which words count
 * as "known" by default) rather than gating any feature.
 */
export const Level = Schema.Literals(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type Level = Schema.Schema.Type<typeof Level>;

/**
 * A language the user is studying.
 *
 * `code` is the study language and `baseCode` the language translations are rendered in, so a
 * Spanish-speaker learning German and an English-speaker learning German hold two distinct objects
 * and never share a vocabulary deck by accident.
 */
export class Language extends Type.makeObject<Language>(DXN.make('org.dxos.type.lingo.language', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name', description: 'Display name (e.g. "Spanish").' })),
    code: Schema.String.pipe(
      Schema.annotate({ title: 'Code', description: 'BCP-47 tag of the language being studied (e.g. "es").' }),
    ),
    baseCode: Schema.String.pipe(
      Schema.annotate({ title: 'Base language', description: 'BCP-47 tag translations are rendered in.' }),
      Schema.optional,
    ),
    level: Level.pipe(Schema.annotate({ title: 'Level', description: 'CEFR proficiency band.' }), Schema.optional),
    description: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['name']),
    DescriptionAnnotation.set('description'),
    Annotation.IconAnnotation.set({ icon: 'ph--translate--regular', hue: 'teal' }),
  ),
) {}

/** Default base language when the user has not chosen one. */
export const DEFAULT_BASE_CODE = 'en';

/** Creates a Language object. */
export const make = (props: Obj.MakeProps<typeof Language>): Language => Obj.make(Language, props);

/** Checks if a value is a Language object. */
export const instanceOf = (value: unknown): value is Language => Obj.instanceOf(Language, value);

/** The language translations are rendered in, falling back to {@link DEFAULT_BASE_CODE}. */
export const getBaseCode = (language: Language): string => language.baseCode ?? DEFAULT_BASE_CODE;
