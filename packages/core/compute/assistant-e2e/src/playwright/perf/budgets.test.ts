//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'vitest';

import { groupOfId, parseBudgets } from '@dxos/perf-harness/score';

describe('chat perf budgets', () => {
  test('every committed budget is a valid range in a known group', ({ expect }) => {
    const budgets = parseBudgets(JSON.parse(readFileSync(path.join(import.meta.dirname, 'budgets.json'), 'utf8')));
    const groups = new Set(Object.keys(budgets).map(groupOfId));
    expect([...groups].sort()).toEqual(['run', 'stage CPU', 'stage wall time']);
  });
});
