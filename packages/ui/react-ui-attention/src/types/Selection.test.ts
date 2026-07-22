//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { createDefaultBackends } from '../core';
import * as Selection from './Selection';
import { Manager } from './ViewState';

describe('selection helpers', () => {
  test('aspect declares a memory-backed aspect', ({ expect }) => {
    expect(Selection.aspect.key).toEqual('selection');
    expect(Selection.aspect.backend).toEqual('memory');
    expect(Selection.aspect.defaultValue()).toEqual({ mode: 'multi', ids: [] });
  });

  test('resolveSelection extracts the value for the requested mode', ({ expect }) => {
    expect(Selection.resolve({ mode: 'single', id: 'x' }, 'single')).toEqual('x');
    expect(Selection.resolve({ mode: 'multi', ids: ['a', 'b'] }, 'multi')).toEqual(['a', 'b']);
    expect(Selection.resolve({ mode: 'range', from: 'a', to: 'b' }, 'range')).toEqual({ from: 'a', to: 'b' });
    expect(Selection.resolve({ mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] }, 'multi-range')).toEqual([
      { from: 'a', to: 'b' },
    ]);
  });

  test('resolveSelection returns the requested-mode default on mismatch or undefined', ({ expect }) => {
    expect(Selection.resolve(undefined, 'single')).toBeUndefined();
    expect(Selection.resolve(undefined, 'multi')).toEqual([]);
    // Stored value is the default multi but a single reader asks — yields the single default.
    expect(Selection.resolve({ mode: 'multi', ids: [] }, 'single')).toBeUndefined();
    expect(Selection.resolve({ mode: 'range' }, 'range')).toBeUndefined();
  });

  test('toggleSelection adds/removes within a multi selection', ({ expect }) => {
    expect(Selection.toggle({ mode: 'multi', ids: ['a'] }, 'b')).toEqual({ mode: 'multi', ids: ['a', 'b'] });
    expect(Selection.toggle({ mode: 'multi', ids: ['a', 'b'] }, 'b')).toEqual({ mode: 'multi', ids: ['a'] });
    // Tolerate a non-multi current value by starting fresh.
    expect(Selection.toggle({ mode: 'single', id: 'x' }, 'b')).toEqual({ mode: 'multi', ids: ['b'] });
  });
});

describe('getValue', () => {
  const makeManager = () => {
    const registry = Registry.make();
    return new Manager({ registry, backends: createDefaultBackends(registry) });
  };

  test('unions multi-selected ids across every context', ({ expect }) => {
    const manager = makeManager();
    manager.set(Selection.aspect, 'ctx-a', { mode: 'multi', ids: ['a1', 'a2'] });
    manager.set(Selection.aspect, 'ctx-b', { mode: 'multi', ids: ['a2', 'b1'] });
    // Single-mode contexts contribute nothing to the set.
    manager.set(Selection.aspect, 'ctx-c', { mode: 'single', id: 'c1' });
    expect(Selection.getValue(manager)).toEqual(new Set(['a1', 'a2', 'b1']));
  });

  test('seeds the set with the optional explicit contextId', ({ expect }) => {
    const manager = makeManager();
    manager.set(Selection.aspect, 'ctx-a', { mode: 'multi', ids: ['a1'] });
    expect(Selection.getValue(manager, 'explicit')).toEqual(new Set(['explicit', 'a1']));
  });

  test('returns an empty set when nothing is selected', ({ expect }) => {
    expect(Selection.getValue(makeManager())).toEqual(new Set());
  });
});
