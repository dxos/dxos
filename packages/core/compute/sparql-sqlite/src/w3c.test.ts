//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type W3cTest, loadW3cTests, runW3cTest, sqlEngine } from './testing/w3c/index.ts';
import knownFailures from './testing/w3c/known-failures.json' with { type: 'json' };

// W3C SPARQL 1.0 (data-r2) and 1.1 query test suites; see docs/CONFORMANCE.md.
// A test listed in known-failures.json must keep failing (`test.fails`): when one starts passing,
// remove it from the list, so both regressions and improvements show up in CI.

const KNOWN: Record<string, string> = knownFailures;
const tests = loadW3cTests();

const byCategory = new Map<string, W3cTest[]>();
for (const w3cTest of tests) {
  byCategory.set(w3cTest.category, [...(byCategory.get(w3cTest.category) ?? []), w3cTest]);
}

describe('W3C SPARQL test suite', () => {
  test('known-failures.json names only existing tests', ({ expect }) => {
    const ids = new Set(tests.map((w3cTest) => w3cTest.id));
    expect(Object.keys(KNOWN).filter((id) => !ids.has(id))).toEqual([]);
  });

  for (const [category, group] of byCategory) {
    describe(category, () => {
      for (const w3cTest of group) {
        const run = w3cTest.skip ? test.skip : KNOWN[w3cTest.id] ? test.fails : test;
        run(w3cTest.skip ? `${w3cTest.id} (${w3cTest.skip})` : w3cTest.id, async ({ expect }) => {
          const outcome = await runW3cTest(sqlEngine, w3cTest);
          expect(outcome.status, outcome.message).toBe('pass');
        });
      }
    });
  }
});
