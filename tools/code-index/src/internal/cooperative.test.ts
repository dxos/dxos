//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Cooperative from './cooperative.ts';

describe('Cooperative', () => {
  test('a long loop lets the event loop run between slices', async () => {
    const items = Array.from({ length: 50_000 }, (_, index) => index);
    let turns = 0;
    let looping = true;
    const turn = () => {
      if (looping) {
        turns++;
        setImmediate(turn);
      }
    };
    setImmediate(turn);
    const [doubled, odd] = await EffectEx.runPromise(
      Effect.all([Cooperative.map(items, (item) => item * 2), Cooperative.filter(items, (item) => item % 2 === 1)]),
    );
    looping = false;

    expect(doubled).toEqual(items.map((item) => item * 2));
    expect(odd).toEqual(items.filter((item) => item % 2 === 1));
    // Each 4096-item slice ends in a yield; a plain loop would allow no turn at all.
    expect(turns).toBeGreaterThan(10);
  });
});
