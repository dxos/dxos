//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { afterEach, describe, test } from 'vitest';

import { branchDiffAtom, clearBranchDiff, setBranchDiff } from './branch-diff';

describe('branchDiffAtom', () => {
  afterEach(() => {
    // Module-scoped state: reset the keys used here so cases stay independent.
    clearBranchDiff('a');
    clearBranchDiff('b');
  });

  test('reflects set/clear per object and isolates keys', ({ expect }) => {
    const registry = Registry.make();
    expect(registry.get(branchDiffAtom('a'))).toBeUndefined();

    setBranchDiff('a', 'main');
    expect(registry.get(branchDiffAtom('a'))).toEqual({ compareTo: 'main' });
    // A different object is unaffected.
    expect(registry.get(branchDiffAtom('b'))).toBeUndefined();

    setBranchDiff('a', 'b1');
    expect(registry.get(branchDiffAtom('a'))).toEqual({ compareTo: 'b1' });

    clearBranchDiff('a');
    expect(registry.get(branchDiffAtom('a'))).toBeUndefined();
  });

  test('a request is visible to a registry that subscribes after it was set (cross-surface)', ({ expect }) => {
    setBranchDiff('a', 'main');
    // A separate registry (e.g. a different surface) still observes the request from module state.
    const otherRegistry = Registry.make();
    expect(otherRegistry.get(branchDiffAtom('a'))).toEqual({ compareTo: 'main' });
  });
});
