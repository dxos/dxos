//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import { commentsViewAspect } from './comments-view-state';

describe('commentsViewAspect', () => {
  test('declares a memory-backed aspect with resolved threads hidden by default', ({ expect }) => {
    expect(commentsViewAspect.key).toEqual('comments-view');
    expect(commentsViewAspect.backend).toEqual('memory');
    expect(commentsViewAspect.defaultValue()).toEqual({ showResolvedThreads: false });
  });

  test('per-subject state is isolated and round-trips through the manager', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });

    expect(manager.get(commentsViewAspect, 'subject-a')).toEqual({ showResolvedThreads: false });

    manager.set(commentsViewAspect, 'subject-a', { showResolvedThreads: true });
    expect(manager.get(commentsViewAspect, 'subject-a')).toEqual({ showResolvedThreads: true });
    // A different subject keeps its own (default) state.
    expect(manager.get(commentsViewAspect, 'subject-b')).toEqual({ showResolvedThreads: false });
  });
});
