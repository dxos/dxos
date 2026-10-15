//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createRandom } from './random.ts';

describe('createRandom', () => {
  test('is deterministic per seed and forks independently', ({ expect }) => {
    const a = createRandom(7);
    const b = createRandom(7);
    const sequence = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(sequence);
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(createRandom(8).next()).not.toBe(sequence[0]);
    expect(createRandom(7).fork('x').next()).toBe(createRandom(7).fork('x').next());
    expect(createRandom(7).fork('x').next()).not.toBe(createRandom(7).fork('y').next());
  });

  test('int, pick and shuffle', ({ expect }) => {
    const random = createRandom(1);
    for (let k = 0; k < 50; k++) {
      const value = random.int(2, 4);
      expect(value >= 2 && value <= 4 && Number.isInteger(value)).toBe(true);
    }
    expect(['a', 'b']).toContain(random.pick(['a', 'b']));
    expect(() => random.pick([])).toThrow(/empty/);
    expect([...random.shuffle([1, 2, 3, 4])].sort()).toEqual([1, 2, 3, 4]);
  });
});
