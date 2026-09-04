//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { LingoOperation, Word } from '#types';

const handler: Operation.WithHandler<typeof LingoOperation.RecordReview> = LingoOperation.RecordReview.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ word: wordRef, correct }) {
      const word = yield* Database.load(wordRef);
      const progress = Word.applyReview(word.progress, correct, new Date());
      Obj.update(word, (word) => {
        word.progress = progress;
      });

      return { progress };
    }),
  ),
);

export default handler;
