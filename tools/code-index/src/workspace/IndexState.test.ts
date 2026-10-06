//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Watch from '../Watch.ts';
import * as IndexState from './IndexState.ts';

const NOW = 1_700_000_000_000;

const fold = (events: readonly Watch.Event[], initial: IndexState.State = { _tag: 'Starting' }): IndexState.State[] => {
  const states: IndexState.State[] = [];
  events.reduce((state, event) => {
    const next = IndexState.apply(state, event, NOW);
    states.push(next);
    return next;
  }, initial);
  return states;
};

const passed: Watch.Event = { _tag: 'Passed', indexed: 3, removed: 1, derived: 10, reasoned: true, totalMs: 900 };

describe('IndexState', () => {
  test('a pass counts its phases and reasoners, then settles up to date', ({ expect }) => {
    const states = fold([
      { _tag: 'Started', reasoners: 2 },
      { _tag: 'Progress', progress: { phase: 'scan', ms: 1, scanned: 10, changed: 3 } },
      { _tag: 'Progress', progress: { phase: 'parse', ms: 1, files: 3 } },
      { _tag: 'Progress', progress: { phase: 'commit', ms: 1 } },
      {
        _tag: 'Progress',
        progress: { phase: 'reasoner', outcome: { name: 'a', derived: 1, durationMs: 1, incremental: true } },
      },
      {
        _tag: 'Progress',
        progress: { phase: 'reasoner', outcome: { name: 'b', derived: 1, durationMs: 1, incremental: true } },
      },
      { _tag: 'Progress', progress: { phase: 'reason', ms: 2 } },
      passed,
    ]);
    expect(states.map(IndexState.describe)).toEqual([
      'Indexing · scan 1/5',
      'Indexing · parse 2/5',
      'Indexing · commit 3/5',
      'Indexing · reason 4/5',
      'Indexing · reason 5/5',
      'Indexing · reason 5/5',
      'Indexing · reason 5/5',
      'Up to date',
    ]);
    expect(states.at(-1)).toEqual({ _tag: 'UpToDate', at: NOW, indexed: 3, removed: 1 });
  });

  test('skipped reasoners jump to the last step, and a pass with none has three', ({ expect }) => {
    const skipped = fold([
      { _tag: 'Started', reasoners: 4 },
      { _tag: 'Progress', progress: { phase: 'scan', ms: 1, scanned: 10, changed: 0 } },
      { _tag: 'Progress', progress: { phase: 'parse', ms: 0, files: 0 } },
      { _tag: 'Progress', progress: { phase: 'commit', ms: 0 } },
      { _tag: 'Progress', progress: { phase: 'reason-skipped' } },
    ]);
    expect(IndexState.describe(skipped.at(-1) ?? { _tag: 'Starting' })).toBe('Indexing · reason 7/7');

    const plain = fold([
      { _tag: 'Started', reasoners: 0 },
      { _tag: 'Progress', progress: { phase: 'scan', ms: 1, scanned: 10, changed: 1 } },
      { _tag: 'Progress', progress: { phase: 'parse', ms: 1, files: 1 } },
      { _tag: 'Progress', progress: { phase: 'commit', ms: 1 } },
    ]);
    expect(plain.map(IndexState.describe)).toEqual([
      'Indexing · scan 1/3',
      'Indexing · parse 2/3',
      'Indexing · commit 3/3',
      'Indexing · commit 3/3',
    ]);
  });

  test('a failure shows its first line, and the next pass clears it', ({ expect }) => {
    const states = fold([
      { _tag: 'Started', reasoners: 0 },
      { _tag: 'Failed', message: 'reindex failed\nStoreError: disk full\n  at somewhere' },
      { _tag: 'Started', reasoners: 0 },
      passed,
    ]);
    expect(states[1]).toEqual({ _tag: 'Failed', message: 'reindex failed' });
    expect(states.map(IndexState.describe)).toEqual([
      'Indexing · scan 1/3',
      'Indexing failed · reindex failed',
      'Indexing · scan 1/3',
      'Up to date',
    ]);
  });

  test('progress without a start still counts, and a static store shows no line', ({ expect }) => {
    const [state] = fold([{ _tag: 'Progress', progress: { phase: 'scan', ms: 1, scanned: 1, changed: 1 } }], {
      _tag: 'UpToDate',
      at: 0,
      indexed: 0,
      removed: 0,
    });
    expect(IndexState.describe(state)).toBe('Indexing · parse 2/3');
    expect(IndexState.describe({ _tag: 'Static' })).toBeUndefined();
  });
});
