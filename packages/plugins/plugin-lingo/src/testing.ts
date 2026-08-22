//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';
import { type Segmentation, alignSegments } from '@dxos/nlp';

import { Language, Vocabulary, Word } from '#types';

/**
 * A short Japanese passage whose vocabulary overlaps {@link makeTestDeck}.
 *
 * Japanese on purpose: it has no word delimiters and it uses `reading`, so it exercises the
 * segmenter and the furigana line that a space-delimited language leaves dead.
 */
export const TEST_PASSAGE = [
  '# 朝の市場',
  '',
  '毎朝、**パン屋**は夜明け前に店を開けます。',
  '市場で小麦粉を買って、その日のパンを作ります。',
  '',
  '近所の人たちは早く来ます。焼きたてのパンはすぐに売り切れるからです。',
].join('\n');

/** {@link TEST_PASSAGE} in English, standing in for a live passage translation in stories. */
export const TEST_PASSAGE_TRANSLATION = [
  '# The morning market',
  '',
  'Every morning the **bakery** opens its shop before dawn.',
  "It buys flour at the market and makes the day's bread.",
  '',
  'The neighbours arrive early, because the fresh bread sells out quickly.',
].join('\n');

const ENTRIES: Array<Pick<Word.Word, 'term' | 'translation' | 'reading' | 'partOfSpeech'> & { box?: number }> = [
  { term: '市場', translation: 'market', reading: 'いちば', partOfSpeech: 'noun', box: 3 },
  { term: 'パン屋', translation: 'bakery', reading: 'パンや', partOfSpeech: 'noun', box: 1 },
  { term: '店', translation: 'shop', reading: 'みせ', partOfSpeech: 'noun', box: 5 },
  { term: '小麦粉', translation: 'flour', reading: 'こむぎこ', partOfSpeech: 'noun' },
  { term: '夜明け', translation: 'dawn', reading: 'よあけ', partOfSpeech: 'noun', box: 2 },
  { term: '近所', translation: 'neighbourhood', reading: 'きんじょ', partOfSpeech: 'noun', box: 4 },
];

/** An unsaved language, deck and words for stories and tests. */
export const makeTestDeck = () => {
  const language = Language.make({ name: 'Japanese', code: 'ja', baseCode: 'en', level: 'A2' });
  const vocabulary = Vocabulary.make({ name: '市場の単語', language: Ref.make(language) });
  const words = ENTRIES.map(({ box, ...entry }) =>
    Word.make({
      ...entry,
      vocabulary: Ref.make(vocabulary),
      language: Ref.make(language),
      progress: box ? { ...Word.initialProgress(), box, reviews: box * 2, correct: box } : undefined,
    }),
  );

  return { language, vocabulary, words };
};

/**
 * The analysis a model would produce for {@link TEST_PASSAGE} and its translation, built through
 * the real aligner so the ranges are computed exactly as they would be in production.
 *
 * A fixture rather than a live call because the interaction under test — hover, select, mirror — is
 * about the ranges, not about how they were derived.
 */
export const PAIRED_ANALYSIS: Segmentation = alignSegments(
  TEST_PASSAGE,
  [
    {
      kind: 'sentence',
      text: '毎朝、**パン屋**は夜明け前に店を開けます。',
      translation: 'Every morning the **bakery** opens its shop before dawn.',
      children: [
        {
          kind: 'clause',
          text: '夜明け前に',
          translation: 'before dawn',
          children: [
            {
              kind: 'vocab',
              text: '夜明け',
              translation: 'dawn',
              gloss: 'dawn',
              reading: 'よあけ',
            },
          ],
        },
        {
          kind: 'vocab',
          text: '店',
          translation: 'shop',
          gloss: 'shop',
          reading: 'みせ',
        },
      ],
    },
    {
      kind: 'sentence',
      text: '市場で小麦粉を買って、その日のパンを作ります。',
      translation: "It buys flour at the market and makes the day's bread.",
      children: [
        {
          kind: 'vocab',
          text: '市場',
          translation: 'market',
          gloss: 'market',
          reading: 'いちば',
        },
        {
          kind: 'vocab',
          text: '小麦粉',
          translation: 'flour',
          gloss: 'flour',
          reading: 'こむぎこ',
        },
      ],
    },
  ],
  TEST_PASSAGE_TRANSLATION,
);
