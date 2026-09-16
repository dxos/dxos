//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { foldBreakdown } from './memory.ts';

describe('foldBreakdown', () => {
  test('empty breakdown folds to no scopes', () => {
    expect(foldBreakdown([])).toEqual({});
  });

  test('maps realm scopes to the bounded attribute values', () => {
    const totals = foldBreakdown([
      { bytes: 100, attribution: [{ scope: 'Window' }] },
      { bytes: 200, attribution: [{ scope: 'SharedWorkerGlobalScope' }] },
      { bytes: 300, attribution: [{ scope: 'DedicatedWorkerGlobalScope' }] },
    ]);

    expect(totals).toEqual({ 'window': 100, 'shared-worker': 200, 'dedicated-worker': 300 });
  });

  test('sums entries sharing a scope', () => {
    // Several dedicated workers are the normal case, and each contributes its own entry.
    const totals = foldBreakdown([
      { bytes: 10, attribution: [{ scope: 'DedicatedWorkerGlobalScope' }] },
      { bytes: 30, attribution: [{ scope: 'DedicatedWorkerGlobalScope' }] },
    ]);

    expect(totals).toEqual({ 'dedicated-worker': 40 });
  });

  test('unattributed and unknown scopes bucket to other rather than being dropped', () => {
    // Dropping them would leave the scopes failing to sum to the total the browser reported.
    const totals = foldBreakdown([
      { bytes: 5, attribution: [] },
      { bytes: 7, attribution: [{}] },
      { bytes: 11, attribution: [{ scope: 'ServiceWorkerGlobalScope' }] },
    ]);

    expect(totals).toEqual({ other: 23 });
  });

  test('scopes sum to the reported total', () => {
    const breakdown = [
      { bytes: 100, attribution: [{ scope: 'Window' }] },
      { bytes: 250, attribution: [{ scope: 'SharedWorkerGlobalScope' }] },
      { bytes: 40, attribution: [] },
    ];
    const totals = foldBreakdown(breakdown);

    const summed = Object.values(totals).reduce((sum, bytes) => sum + bytes, 0);
    expect(summed).toEqual(breakdown.reduce((sum, { bytes }) => sum + bytes, 0));
  });
});
