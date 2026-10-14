//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ontology from '../../types/Ontology.ts';
import { matchingPredicates } from './match.ts';

const IS_A = Ontology.DEFAULT.resolve('is a').iri;
const WORKS_AT = Ontology.DEFAULT.resolve('works at').iri;
const STORED = new Map([
  [IS_A, 'is a'],
  [WORKS_AT, 'works at'],
]);

describe('matchingPredicates', () => {
  test('matches whole words of the relation key, not characters', ({ expect }) => {
    // `is a` keys as `a`, which is a substring of `work_at` but not one of its words.
    expect(matchingPredicates('work at', STORED)).toEqual(new Set([WORKS_AT]));
    expect(matchingPredicates('is working at', STORED)).toEqual(new Set([WORKS_AT]));
  });

  test('a query that names part of a relation still finds it', ({ expect }) => {
    expect(matchingPredicates('works', STORED).has(WORKS_AT)).toBe(true);
  });
});
