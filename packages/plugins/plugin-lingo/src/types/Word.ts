//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import * as Language from './Language';
import * as Vocabulary from './Vocabulary';

export const PartOfSpeech = Schema.Literals([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'phrase',
]);
export type PartOfSpeech = Schema.Schema.Type<typeof PartOfSpeech>;

/** Number of Leitner boxes; a word graduates out of drilling once it passes the last one. */
export const BOX_COUNT = 5;

/**
 * Scheduling state for one word, as a Leitner box plus the counters the flashcard article reports.
 *
 * Deliberately a plain embedded struct rather than a review-log object: the drill needs one atomic
 * read per card, and a per-review audit trail is a Phase 3 concern (see DESIGN.md).
 */
export const Progress = Schema.Struct({
  box: Schema.Number.pipe(Schema.annotate({ description: `Leitner box, 0..${BOX_COUNT}.` })),
  reviews: Schema.Number,
  correct: Schema.Number,
  /** Consecutive correct answers; reset to zero on a miss. */
  streak: Schema.Number,
  /** ISO timestamp of the last answer. */
  reviewedAt: Schema.optional(Schema.String),
  /** ISO timestamp the card next becomes due. */
  dueAt: Schema.optional(Schema.String),
});
export interface Progress extends Schema.Schema.Type<typeof Progress> {}

/**
 * A single vocabulary entry.
 *
 * Deck membership is the word's own `vocabulary` ref, and `language` is denormalized alongside it
 * so the reader can look a term up across every deck for the language being read with one query.
 */
export class Word extends Type.makeObject<Word>(DXN.make('org.dxos.type.lingo.word', '0.1.0'))(
  Schema.Struct({
    term: Schema.String.pipe(Schema.annotate({ title: 'Term', description: 'The word as it appears in text.' })),
    translation: Schema.String.pipe(Schema.annotate({ title: 'Translation' })),
    /** Dictionary form, when `term` was harvested inflected; the reader matches on both. */
    lemma: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Lemma' }))),
    /** Pronunciation or romanization (e.g. pinyin, furigana). */
    reading: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Reading' }))),
    partOfSpeech: Schema.optional(PartOfSpeech.pipe(Schema.annotate({ title: 'Part of speech' }))),
    notes: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Notes' }))),
    examples: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
    vocabulary: Ref.Ref(Vocabulary.Vocabulary),
    language: Ref.Ref(Language.Language),
    progress: Schema.optional(Progress),
  }).pipe(LabelAnnotation.set(['term']), Annotation.IconAnnotation.set({ icon: 'ph--text-aa--regular', hue: 'teal' })),
) {}

/** Creates a Word object. */
export const make = (props: Obj.MakeProps<typeof Word>): Word => Obj.make(Word, props);

/** Checks if a value is a Word object. */
export const instanceOf = (value: unknown): value is Word => Obj.instanceOf(Word, value);

/** Zeroed progress for a word that has never been drilled. */
export const initialProgress = (): Progress => ({ box: 0, reviews: 0, correct: 0, streak: 0 });

/** Leitner interval in days for each box; box 0 repeats within the same session. */
const INTERVAL_DAYS = [0, 1, 3, 7, 21];

/**
 * Advances (or resets) a word's Leitner box after one answer and returns the next progress.
 * A miss drops straight to box 0 rather than stepping down: a word the user cannot recall has to
 * re-earn every interval, which is the whole point of the schedule.
 */
export const applyReview = (progress: Progress | undefined, correct: boolean, now: Date): Progress => {
  const current = progress ?? initialProgress();
  const box = correct ? Math.min(current.box + 1, BOX_COUNT) : 0;
  const dueAt = new Date(now.getTime() + (INTERVAL_DAYS[Math.min(box, INTERVAL_DAYS.length - 1)] ?? 0) * DAY_MS);
  return {
    box,
    reviews: current.reviews + 1,
    correct: current.correct + (correct ? 1 : 0),
    streak: correct ? current.streak + 1 : 0,
    reviewedAt: now.toISOString(),
    dueAt: dueAt.toISOString(),
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * True when the word is due for review (never-drilled words are always due).
 *
 * A word that has passed the last box has graduated and never comes due again: `applyReview` still
 * stamps a `dueAt` on it, since the last interval is what a card in the final box would wait, but
 * reaching `BOX_COUNT` is what takes it out of the drill.
 */
export const isDue = (word: Pick<Word, 'progress'>, now: Date): boolean =>
  (word.progress?.box ?? 0) < BOX_COUNT &&
  (!word.progress?.dueAt || new Date(word.progress.dueAt).getTime() <= now.getTime());

/** Ratio of correct answers, or `undefined` before the first review. */
export const getScore = (word: Word): number | undefined =>
  word.progress?.reviews ? word.progress.correct / word.progress.reviews : undefined;
