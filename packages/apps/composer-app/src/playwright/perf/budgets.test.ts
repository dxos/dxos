//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'vitest';

import { groupOfId, parseBudgets } from '@dxos/perf-harness/score';

const groupsOf = (file: string) => {
  const budgets = parseBudgets(JSON.parse(readFileSync(path.join(import.meta.dirname, file), 'utf8')));
  return [...new Set(Object.keys(budgets).map(groupOfId))].sort();
};

describe('perf budgets', () => {
  test('every committed budget is a valid range in a known group', ({ expect }) => {
    expect(groupsOf('budgets.json')).toEqual(['run', 'stage CPU', 'stage wall time', 'work']);
  });

  test('the counters-on pass budgets work counters alone', ({ expect }) => {
    expect(groupsOf('budgets-counters.json').every((group) => group === 'work')).toBe(true);
  });
});
