//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { Unit } from './unit';

describe('url', () => {
  it('duration', ({ expect }) => {
    const tests: [number, string][] = [
      [0, '0ms'],
      [1, '1ms'],
      [1_000, '1.0s'],
      [2_887, '2.9s'],
      [1_000 * 60, '1m'],
      [1_000 * 60 + 1_000 * 5, '1m 5s'],
      [1_000 * 60 * 60 + 1_000 * 60 * 5, '1h 5m'],
    ];

    tests.forEach(([input, output]) => {
      expect(Unit.Duration(input).toString(), input.toString()).toBe(output);
    });
  });
});
