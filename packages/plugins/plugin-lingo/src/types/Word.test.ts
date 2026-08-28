//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Word } from '#types';

const at = (iso: string) => new Date(iso);
const NOW = at('2026-01-01T00:00:00.000Z');

// The drill's whole schedule lives in `applyReview` + `isDue`, and both are pure — so the Leitner
// behaviour is worth pinning down here rather than through the article that renders it.
describe('Word scheduling', () => {
  test('a correct answer advances one box; a miss drops straight to zero', ({ expect }) => {
    let progress = Word.applyReview(undefined, true, NOW);
    expect(progress.box).toBe(1);
    progress = Word.applyReview(progress, true, NOW);
    expect(progress.box).toBe(2);

    // Not a step down: a word the learner cannot recall has to re-earn every interval.
    progress = Word.applyReview(progress, false, NOW);
    expect(progress.box).toBe(0);
    expect(progress.streak).toBe(0);
  });

  test('a word that passes the last box graduates and never comes due again', ({ expect }) => {
    let progress = Word.applyReview(undefined, true, NOW);
    for (let box = 1; box < Word.BOX_COUNT; ++box) {
      progress = Word.applyReview(progress, true, NOW);
    }
    expect(progress.box).toBe(Word.BOX_COUNT);

    // `applyReview` still stamps a `dueAt` — the last interval is what a card in the final box would
    // wait — so reaching BOX_COUNT is what has to take the word out of the drill, not the date.
    const word = { progress };
    expect(Word.isDue(word, at('2100-01-01T00:00:00.000Z'))).toBe(false);
  });

  test('a never-drilled word is always due', ({ expect }) => {
    expect(Word.isDue({}, NOW)).toBe(true);
  });

  test('a word below the last box comes due once its interval has passed', ({ expect }) => {
    const progress = Word.applyReview(undefined, true, NOW);
    expect(Word.isDue({ progress }, NOW)).toBe(false);
    expect(Word.isDue({ progress }, at('2026-01-03T00:00:00.000Z'))).toBe(true);
  });
});
