//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';

import { type Vocabulary, Word } from '#types';

/** Lookup key for a term: matches `normalizeToken` in the reader extension. */
export const normalizeTerm = (term: string): string =>
  term.trim().toLocaleLowerCase().normalize('NFC').replace(/’/g, "'");

/** Every word filed under a deck. */
export const queryWords = (deck: Vocabulary.Vocabulary) =>
  Database.query(Filter.type(Word.Word, { vocabulary: Ref.make(deck) })).run;

/**
 * Adds a term to a deck unless it is already there, returning the word and whether it pre-existed.
 * Dedup is on the normalized lemma (falling back to the term), so re-running an extraction over a
 * document that grew since the last pass appends only what is new.
 */
export const addWord = Effect.fn('addWord')(function* (
  deck: Vocabulary.Vocabulary,
  props: Omit<Obj.MakeProps<typeof Word.Word>, 'vocabulary' | 'language' | 'progress'>,
) {
  const words = yield* queryWords(deck);
  const key = normalizeTerm(props.lemma ?? props.term);
  const existing = words.find((word) => normalizeTerm(word.lemma ?? word.term) === key);
  if (existing) {
    return { word: existing, existing: true as const };
  }

  const word = yield* Database.add(Word.make({ ...props, vocabulary: Ref.make(deck), language: deck.language }));

  return { word, existing: false as const };
});
