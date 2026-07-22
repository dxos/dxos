//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { createDefaultBackends } from '../backends';
import { ViewStateManager } from '../view-state';
import { getSelectionSet, resolveSelection, selectionAspect, toggleSelection } from './Selection';

describe('selection helpers', () => {
  test('selectionAspect declares a memory-backed aspect', ({ expect }) => {
    expect(selectionAspect.key).toEqual('selection');
    expect(selectionAspect.backend).toEqual('memory');
    expect(selectionAspect.defaultValue()).toEqual({ mode: 'multi', ids: [] });
  });

  test('resolveSelection extracts the value for the requested mode', ({ expect }) => {
    expect(resolveSelection({ mode: 'single', id: 'x' }, 'single')).toEqual('x');
    expect(resolveSelection({ mode: 'multi', ids: ['a', 'b'] }, 'multi')).toEqual(['a', 'b']);
    expect(resolveSelection({ mode: 'range', from: 'a', to: 'b' }, 'range')).toEqual({ from: 'a', to: 'b' });
    expect(resolveSelection({ mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] }, 'multi-range')).toEqual([
      { from: 'a', to: 'b' },
    ]);
  });

  test('resolveSelection returns the requested-mode default on mismatch or undefined', ({ expect }) => {
    expect(resolveSelection(undefined, 'single')).toBeUndefined();
    expect(resolveSelection(undefined, 'multi')).toEqual([]);
    // Stored value is the default multi but a single reader asks — yields the single default.
    expect(resolveSelection({ mode: 'multi', ids: [] }, 'single')).toBeUndefined();
    expect(resolveSelection({ mode: 'range' }, 'range')).toBeUndefined();
  });

  test('toggleSelection adds/removes within a multi selection', ({ expect }) => {
    expect(toggleSelection({ mode: 'multi', ids: ['a'] }, 'b')).toEqual({ mode: 'multi', ids: ['a', 'b'] });
    expect(toggleSelection({ mode: 'multi', ids: ['a', 'b'] }, 'b')).toEqual({ mode: 'multi', ids: ['a'] });
    // Tolerate a non-multi current value by starting fresh.
    expect(toggleSelection({ mode: 'single', id: 'x' }, 'b')).toEqual({ mode: 'multi', ids: ['b'] });
  });
});

describe('getSelectionSet', () => {
  const makeManager = () => {
    const registry = Registry.make();
    return new ViewStateManager({ registry, backends: createDefaultBackends(registry) });
  };

  test('unions multi-selected ids across every context', ({ expect }) => {
    const manager = makeManager();
    manager.set(selectionAspect, 'ctx-a', { mode: 'multi', ids: ['a1', 'a2'] });
    manager.set(selectionAspect, 'ctx-b', { mode: 'multi', ids: ['a2', 'b1'] });
    // Single-mode contexts contribute nothing to the set.
    manager.set(selectionAspect, 'ctx-c', { mode: 'single', id: 'c1' });
    expect(getSelectionSet(manager)).toEqual(new Set(['a1', 'a2', 'b1']));
  });

  test('seeds the set with the optional explicit contextId', ({ expect }) => {
    const manager = makeManager();
    manager.set(selectionAspect, 'ctx-a', { mode: 'multi', ids: ['a1'] });
    expect(getSelectionSet(manager, 'explicit')).toEqual(new Set(['explicit', 'a1']));
  });

  test('returns an empty set when nothing is selected', ({ expect }) => {
    expect(getSelectionSet(makeManager())).toEqual(new Set());
  });
});
