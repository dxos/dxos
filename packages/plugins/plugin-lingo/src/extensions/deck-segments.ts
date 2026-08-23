//
// Copyright 2026 DXOS.org
//

import { type Segment, type Segmentation, sourceHash } from '@dxos/nlp';

/** What the reader knows about one term; `wordId` is set only for terms held in a deck. */
export type VocabularyEntry = {
  term: string;
  translation: string;
  reading?: string;
  partOfSpeech?: string;
  wordId?: string;
};

/** Resolves a token (already normalized with {@link normalizeToken}) to a known entry. */
export type VocabularyLookup = (token: string) => VocabularyEntry | undefined;

/**
 * How many adjacent segments a term may span. ICU splits compounds ("パン屋" → "パン" + "屋"), so a
 * deck term is matched by joining neighbours; the cap bounds the per-token lookup count.
 */
const MAX_SEGMENT_SPAN = 4;

const segmenters = new Map<string, Intl.Segmenter>();

/**
 * Word segmentation via `Intl.Segmenter` rather than a `\p{L}+` regex: Japanese, Chinese and Thai
 * write without delimiters, so a regex returns the whole sentence as one token and nothing matches.
 */
const getSegmenter = (locale?: string): Intl.Segmenter => {
  const key = locale ?? '';
  let segmenter = segmenters.get(key);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    segmenters.set(key, segmenter);
  }

  return segmenter;
};

/** Lookup key for a token: case- and accent-fold so "Buch" and "buch" hit the same entry. */
export const normalizeToken = (token: string): string => token.toLocaleLowerCase().normalize('NFC').replace(/’/g, "'");

type Token = { start: number; end: number; text: string };

const tokenize = (text: string, offset: number, locale?: string): Token[] =>
  Array.from(getSegmenter(locale).segment(text))
    .filter(({ isWordLike }) => isWordLike)
    .map(({ index, segment }) => ({ start: offset + index, end: offset + index + segment.length, text: segment }));

/**
 * Vocabulary segments for the terms a deck already holds.
 *
 * Deterministic and offline: a learner's own vocabulary should be visible without waiting on (or
 * paying for) an analysis pass. These carry the same shape as analyzed segments, so the editor has
 * one selection mechanism rather than two — an analysis simply adds coarser regions around them.
 */
export const deckSegments = (text: string, lookup: VocabularyLookup, locale?: string): Segmentation => {
  const segments: Segment[] = [];
  const lines = text.split('\n');
  let lineStart = 0;
  let nextId = 0;

  for (const line of lines) {
    const tokens = tokenize(line, lineStart, locale);
    let index = 0;
    while (index < tokens.length) {
      let span = Math.min(MAX_SEGMENT_SPAN, tokens.length - index);
      let matched: { entry: VocabularyEntry; start: number; end: number } | undefined;
      // Longest first, so "パン屋" wins over the "パン" ICU split it starts with.
      for (; span > 0; span--) {
        const start = tokens[index].start;
        const end = tokens[index + span - 1].end;
        const entry = lookup(normalizeToken(text.slice(start, end)));
        if (entry) {
          matched = { entry, start, end };
          break;
        }
      }

      if (matched) {
        segments.push({
          id: `d${nextId++}`,
          kind: 'vocab',
          source: { start: matched.start, end: matched.end },
          gloss: matched.entry.translation,
          reading: matched.entry.reading,
        });
        index += span;
      } else {
        index++;
      }
    }

    lineStart += line.length + 1;
  }

  return { sourceHash: sourceHash(text), segments };
};

/**
 * Merges deck vocabulary into an analysis.
 *
 * Analyzed vocab wins on overlap: it was produced with the whole sentence in view, so its
 * boundaries and gloss are the better ones where the two disagree.
 */
export const mergeSegmentations = (analysis: Segmentation, deck: Segmentation): Segmentation => {
  const overlaps = (segment: Segment) =>
    analysis.segments.some(
      (other) =>
        other.kind === 'vocab' && other.source.start < segment.source.end && segment.source.start < other.source.end,
    );

  return {
    ...analysis,
    segments: [...analysis.segments, ...deck.segments.filter((segment) => !overlaps(segment))],
  };
};
