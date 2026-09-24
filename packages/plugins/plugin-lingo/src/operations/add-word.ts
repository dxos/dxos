//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { LingoOperation } from '#types';

import { addWord } from '../util/index.ts';

const handler: Operation.WithHandler<typeof LingoOperation.AddWord> = LingoOperation.AddWord.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ vocabulary, term, translation, lemma, reading, partOfSpeech, examples }) {
      const deck = yield* Database.load(vocabulary);
      const { word, existing } = yield* addWord(deck, {
        term,
        translation,
        lemma,
        reading,
        partOfSpeech,
        examples: examples ? [...examples] : undefined,
      });

      return { word: Ref.make(word), existing };
    }),
  ),
);

export default handler;
