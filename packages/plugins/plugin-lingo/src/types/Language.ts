//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { DescriptionAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

/** CEFR band, advisory only: it tunes how much help the reader shows, and gates no feature. */
export const Level = Schema.Literals(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type Level = Schema.Schema.Type<typeof Level>;

/**
 * A (studied, target) pairing, held as its own object so a Spanish-speaker and an English-speaker
 * learning German never share a word list by accident.
 *
 * `code` is the studied side and BOTH `baseCode` and `name` describe the target — the studied
 * language is the one with no name, which has been misread as the reverse.
 */
export class Language extends Type.makeObject<Language>(DXN.make('org.dxos.type.lingo.language', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(
      Schema.annotate({ title: 'Name', description: 'Display name of the target language (e.g. "Spanish").' }),
    ),
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

/**
 * Scripts where a learner needs a pronunciation guide beside the text, and what that guide is
 * called. Naming the system matters: asking a model for "a reading" of Japanese yields romaji as
 * often as furigana, and the two are not interchangeable for someone learning to read kana.
 */
const READING_SYSTEMS: Record<string, string> = {
  ja: 'furigana — hiragana readings for kanji only',
  zh: 'Hanyu Pinyin with tone marks',
  ko: 'Revised Romanization',
  ar: 'romanization',
  fa: 'romanization',
  he: 'romanization',
  ru: 'romanization',
  th: 'romanization',
  hi: 'romanization',
  el: 'romanization',
};

/** The pronunciation guide for a language, or undefined when its script needs none. */
export const getReadingSystem = (code?: string): string | undefined =>
  code ? (READING_SYSTEMS[code] ?? READING_SYSTEMS[code.split('-')[0]]) : undefined;

/**
 * Offered before any language object exists, so the reader is usable in an empty space; choosing one
 * creates the object. Presentation order is the caller's business -- the reader sorts by name.
 */
export const POPULAR: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fa', name: 'Persian' },
];

/** Creates a Language object. */
export const make = (props: Obj.MakeProps<typeof Language>): Language => Obj.make(Language, props);

/** Checks if a value is a Language object. */
export const instanceOf = (value: unknown): value is Language => Obj.instanceOf(Language, value);

/** The language translations are rendered in, falling back to {@link DEFAULT_BASE_CODE}. */
export const getBaseCode = (language: Language): string => language.baseCode ?? DEFAULT_BASE_CODE;

/**
 * Display name for a BCP-47 code, falling back to the code itself.
 *
 * Models are told which languages they are working between by name, not by tag: a prompt saying
 * "translate into en" reads as an instruction about a token rather than about English.
 */
export const getDisplayName = (code: string): string => POPULAR.find((entry) => entry.code === code)?.name ?? code;
