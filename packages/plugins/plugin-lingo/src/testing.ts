//
// Copyright 2026 DXOS.org
//

import { Ref } from '@dxos/echo';

import { Language, Vocabulary, Word } from '#types';

/** A short Spanish passage whose vocabulary overlaps {@link makeTestDeck}. */
export const TEST_PASSAGE = [
  '# El mercado',
  '',
  'Cada mañana el **panadero** abre su tienda antes del amanecer.',
  'Compra la harina en el mercado y prepara el pan del día.',
  '',
  'Los vecinos llegan temprano porque el pan caliente se acaba pronto.',
].join('\n');

const ENTRIES: Array<Pick<Word.Word, 'term' | 'translation' | 'partOfSpeech'> & { box?: number }> = [
  { term: 'mercado', translation: 'market', partOfSpeech: 'noun', box: 3 },
  { term: 'panadero', translation: 'baker', partOfSpeech: 'noun', box: 1 },
  { term: 'tienda', translation: 'shop', partOfSpeech: 'noun', box: 5 },
  { term: 'harina', translation: 'flour', partOfSpeech: 'noun' },
  { term: 'amanecer', translation: 'dawn', partOfSpeech: 'noun', box: 2 },
  { term: 'vecinos', translation: 'neighbours', partOfSpeech: 'noun', box: 4 },
];

/** An unsaved language, deck and words for stories and tests. */
export const makeTestDeck = () => {
  const language = Language.make({ name: 'Spanish', code: 'es', baseCode: 'en', level: 'A2' });
  const vocabulary = Vocabulary.make({ name: 'Market vocabulary', language: Ref.make(language) });
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
