//
// Copyright 2026 DXOS.org
//

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';

import * as Op from '../Op.ts';
import { applyPatches } from '../testing/index.ts';
import { diffValues, reuseEqual } from './copy.ts';

const json = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: 'small' },
    fc.string({ maxLength: 6 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(tie('value'), { maxLength: 4 }),
    tie('map'),
  ),
  map: fc.dictionary(fc.constantFrom('a', 'b', 'c', 'd'), tie('value'), { maxKeys: 4 }),
})).map;

describe('index copies compared by value', () => {
  test('the patches between two copies turn the first into the second', () => {
    fc.assert(
      fc.property(json, json, (before, after) => {
        expect(applyPatches(before, diffValues(before, after))).toEqual(after);
      }),
      { numRuns: 500 },
    );
  });

  test('a new copy keeps the objects of the old one that did not change', () => {
    fc.assert(
      fc.property(json, json, (base, changed) => {
        const before = { same: base, other: 1 };
        const after = reuseEqual(before, { same: structuredClone(base), other: changed });
        expect(after).toEqual({ same: base, other: changed });
        expect(Op.getAt(after, ['same'])).toBe(before.same);
      }),
      { numRuns: 200 },
    );
  });
});
