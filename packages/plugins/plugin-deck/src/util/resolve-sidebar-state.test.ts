//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { resolveSidebarState } from './resolve-sidebar-state.ts';

describe('resolveSidebarState', () => {
  test('closed presents as collapsed at lg so L0 stays reachable', () => {
    expect(resolveSidebarState('closed', true)).toBe('collapsed');
  });

  test('closed is preserved below lg where the drawer can be dismissed', () => {
    expect(resolveSidebarState('closed', false)).toBe('closed');
  });

  test('collapsed and expanded are unchanged at either breakpoint', () => {
    expect(resolveSidebarState('collapsed', true)).toBe('collapsed');
    expect(resolveSidebarState('collapsed', false)).toBe('collapsed');
    expect(resolveSidebarState('expanded', true)).toBe('expanded');
    expect(resolveSidebarState('expanded', false)).toBe('expanded');
  });
});
