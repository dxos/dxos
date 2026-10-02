//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'vitest';

import { parseBudgets } from '@dxos/perf-harness/score';

import { type BenchJsonReport, benchmarkId, proposeBudgets, toMeasurements } from './results.ts';

const report: BenchJsonReport = {
  files: [
    {
      filepath: '/repo/packages/core/echo/echo-client-e2e/src/parent.bench.ts',
      groups: [
        {
          fullName: 'src/parent.bench.ts > parent edges',
          benchmarks: [
            { name: 'getParent', median: 0.02, mean: 0.03, rme: 1 },
            { name: 'orderTree', mean: 2.5, rme: 40 },
          ],
        },
      ],
    },
  ],
};

describe('bench results', () => {
  test('ids drop the file path vitest prefixes and keep the describe path', ({ expect }) => {
    expect(benchmarkId('/a/src/parent.bench.ts', 'src/parent.bench.ts > parent edges', 'getParent')).toBe(
      'parent > parent edges > getParent',
    );
  });

  test('measures the median, falling back to the mean', ({ expect }) => {
    expect(toMeasurements(report)).toEqual([
      { id: 'parent > parent edges > getParent', group: 'parent', value: 0.02 },
      { id: 'parent > parent edges > orderTree', group: 'parent', value: 2.5 },
    ]);
  });

  test('widens a proposed limit for a noisy row', ({ expect }) => {
    const proposed = proposeBudgets(report, { headroom: 1.1, band: 1.5 });
    expect(proposed['parent > parent edges > getParent']).toEqual({ target: 0.022, limit: 0.033, unit: 'ms' });
    // rme 40% widens the band from 1.5 to 1 + 3 × 0.4.
    expect(proposed['parent > parent edges > orderTree'].limit).toBeCloseTo(2.75 * 2.2, 2);
  });

  test('every committed budget is a valid range', ({ expect }) => {
    // `parseBudgets` validates every range, so reading the file is the check.
    const budgets = parseBudgets(JSON.parse(readFileSync(path.join(import.meta.dirname, 'budgets.json'), 'utf8')));
    expect(Object.keys(budgets).length).toBeGreaterThan(0);
  });
});
