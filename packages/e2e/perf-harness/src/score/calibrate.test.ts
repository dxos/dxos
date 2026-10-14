//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { proposeWorkBudgets } from './calibrate.ts';
import { type StageEvent } from './stages.ts';

const run = (stage: string, values: ReadonlyArray<Record<string, number>>): StageEvent[] =>
  values.map((properties, iteration) => ({ properties: { stage, iteration, ...properties } }));

describe('proposeWorkBudgets', () => {
  test('targets the median of run medians and sizes the limit from the spread', ({ expect }) => {
    const budgets = proposeWorkBudgets([
      run('boot', [{ reactRenders: 1000 }, { reactRenders: 1000 }, { reactRenders: 1000 }]),
      run('boot', [{ reactRenders: 1100 }, { reactRenders: 1100 }, { reactRenders: 1100 }]),
      run('boot', [{ reactRenders: 1050 }, { reactRenders: 1050 }, { reactRenders: 1050 }]),
    ]);
    // Run-to-run CV of 1000/1050/1100 is ~3.9%, so the limit sits ~3 × 3.9% above 1050.
    expect(budgets['reactRenders > boot']).toEqual({ target: 1050, limit: 1170, unit: 'count' });
  });

  test('keeps a few percent of headroom on a counter that never moved, and at least one count', ({ expect }) => {
    const budgets = proposeWorkBudgets([
      run('boot', [{ reactRenders: 400, reactCommits: 3 }]),
      run('boot', [{ reactRenders: 400, reactCommits: 3 }]),
    ]);
    expect(budgets['reactRenders > boot']).toEqual({ target: 400, limit: 420, unit: 'count' });
    expect(budgets['reactCommits > boot']).toEqual({ target: 3, limit: 4, unit: 'count' });
  });

  test('leaves out zeros, noisy counters, missing runs and network-paced stages', ({ expect }) => {
    const budgets = proposeWorkBudgets([
      [
        ...run('boot', [
          { reactRenders: 0, reactCommits: 10, layoutCount: 5 },
          { reactCommits: 30, layoutCount: 5 },
        ]),
        ...run('seed', [{ reactRenders: 100 }]),
      ],
      run('boot', [{ reactRenders: 0, reactCommits: 20 }]),
    ]);
    expect(Object.keys(budgets)).toEqual([]);
  });

  test('budgets bytes in bytes', ({ expect }) => {
    const budgets = proposeWorkBudgets([
      run('boot', [{ automergeSaveBytes: 5000, dataRealms: 1 }]),
      run('boot', [{ automergeSaveBytes: 5000, dataRealms: 1 }]),
    ]);
    expect(budgets['automergeSaveBytes > boot']?.unit).toBe('bytes');
  });
});
