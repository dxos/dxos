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
  '# \u671D\u306E\u5E02\u5834',
  '',
  '\u6BCE\u671D\u3001**\u30D1\u30F3\u5C4B**\u306F\u591C\u660E\u3051\u524D\u306B\u5E97\u3092\u958B\u3051\u307E\u3059\u3002',
  '\u5E02\u5834\u3067\u5C0F\u9EA6\u7C89\u3092\u8CB7\u3063\u3066\u3001\u305D\u306E\u65E5\u306E\u30D1\u30F3\u3092\u4F5C\u308A\u307E\u3059\u3002',
  '',
  '\u8FD1\u6240\u306E\u4EBA\u305F\u3061\u306F\u65E9\u304F\u6765\u307E\u3059\u3002\u713C\u304D\u305F\u3066\u306E\u30D1\u30F3\u306F\u3059\u3050\u306B\u58F2\u308A\u5207\u308C\u308B\u304B\u3089\u3067\u3059\u3002',
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
  { term: '\u5E02\u5834', translation: 'market', reading: '\u3044\u3061\u3070', partOfSpeech: 'noun', box: 3 },
  { term: '\u30D1\u30F3\u5C4B', translation: 'bakery', reading: '\u30D1\u30F3\u3084', partOfSpeech: 'noun', box: 1 },
  { term: '\u5E97', translation: 'shop', reading: '\u307F\u305B', partOfSpeech: 'noun', box: 5 },
  { term: '\u5C0F\u9EA6\u7C89', translation: 'flour', reading: '\u3053\u3080\u304E\u3053', partOfSpeech: 'noun' },
  { term: '\u591C\u660E\u3051', translation: 'dawn', reading: '\u3088\u3042\u3051', partOfSpeech: 'noun', box: 2 },
  {
    term: '\u8FD1\u6240',
    translation: 'neighbourhood',
    reading: '\u304D\u3093\u3058\u3087',
    partOfSpeech: 'noun',
    box: 4,
  },
];

/** An unsaved language, deck and words for stories and tests. */
export const makeTestDeck = () => {
  const language = Language.make({ name: 'Japanese', code: 'ja', baseCode: 'en', level: 'A2' });
  const vocabulary = Vocabulary.make({ name: '\u5E02\u5834\u306E\u5358\u8A9E', language: Ref.make(language) });
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
 * A fixture rather than a live call because the interaction under test - hover, select, mirror - is
 * about the ranges, not about how they were derived.
 */
export const PAIRED_ANALYSIS: Segmentation = alignSegments(
  TEST_PASSAGE,
  [
    {
      kind: 'sentence',
      text: '\u6BCE\u671D\u3001**\u30D1\u30F3\u5C4B**\u306F\u591C\u660E\u3051\u524D\u306B\u5E97\u3092\u958B\u3051\u307E\u3059\u3002',
      translation: 'Every morning the **bakery** opens its shop before dawn.',
      children: [
        {
          kind: 'clause',
          text: '\u591C\u660E\u3051\u524D\u306B',
          translation: 'before dawn',
          children: [
            {
              kind: 'vocab',
              text: '\u591C\u660E\u3051',
              translation: 'dawn',
              gloss: 'dawn',
              reading: '\u3088\u3042\u3051',
            },
          ],
        },
        {
          kind: 'vocab',
          text: '\u5E97',
          translation: 'shop',
          gloss: 'shop',
          reading: '\u307F\u305B',
        },
      ],
    },
    {
      kind: 'sentence',
      text: '\u5E02\u5834\u3067\u5C0F\u9EA6\u7C89\u3092\u8CB7\u3063\u3066\u3001\u305D\u306E\u65E5\u306E\u30D1\u30F3\u3092\u4F5C\u308A\u307E\u3059\u3002',
      translation: "It buys flour at the market and makes the day's bread.",
      children: [
        {
          kind: 'vocab',
          text: '\u5E02\u5834',
          translation: 'market',
          gloss: 'market',
          reading: '\u3044\u3061\u3070',
        },
        {
          kind: 'vocab',
          text: '\u5C0F\u9EA6\u7C89',
          translation: 'flour',
          gloss: 'flour',
          reading: '\u3053\u3080\u304E\u3053',
        },
      ],
    },
  ],
  TEST_PASSAGE_TRANSLATION,
);
