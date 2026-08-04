//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, test } from 'vitest';

import { ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import * as ReviewCapabilities from '../types/ReviewCapabilities';

describe('ReviewCapabilities.ReviewCapabilities.viewAspect', () => {
  const make = () => {
    const registry = Registry.make();
    return new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
  };

  test('declares a per-session (memory) aspect that defaults to empty', ({ expect }) => {
    expect(ReviewCapabilities.ReviewCapabilities.viewAspect.key).toEqual('versioning-view');
    expect(ReviewCapabilities.ReviewCapabilities.viewAspect.backend).toEqual('memory');
    expect(ReviewCapabilities.ReviewCapabilities.viewAspect.defaultValue()).toEqual({});
  });

  test('selection / view / mode round-trip per object id without clobbering', ({ expect }) => {
    const manager = make();
    const { viewAspect } = ReviewCapabilities.ReviewCapabilities;

    manager.update(viewAspect, 'doc1', (prev) => ({ ...prev, mode: 'viewing' as const }));
    manager.update(viewAspect, 'doc1', (prev) => ({
      ...prev,
      selection: { kind: 'branch' as const, branchId: 'b1' },
    }));

    expect(manager.get(viewAspect, 'doc1')).toEqual({
      mode: 'viewing',
      selection: { kind: 'branch', branchId: 'b1' },
    });
    // A different object keeps its own (default) state.
    expect(manager.get(viewAspect, 'doc2')).toEqual({});
  });
});
