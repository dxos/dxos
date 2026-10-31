//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { act, renderHook } from '@testing-library/react';
import * as Registry from 'effect/reactivity/AtomRegistry';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { ViewState, ViewStateProvider, createDefaultBackends } from '@dxos/react-ui-attention';

import { makeCanvas } from '#model';

import { useInspectorDock } from './use-inspector-dock.ts';

const viewer = () => {
  const registry = Registry.make();
  const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
  return ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>
      <ViewStateProvider manager={manager}>{children}</ViewStateProvider>
    </RegistryContext.Provider>
  );
};

describe('useInspectorDock', () => {
  test('the inspectors float until docked, and one dock choice holds for the canvas in either dimension', () => {
    const { canvas } = makeCanvas({ dimension: '3d' });
    const wrapper = viewer();
    const view3d = renderHook(() => useInspectorDock(canvas), { wrapper });
    const view2d = renderHook(() => useInspectorDock(canvas), { wrapper });
    expect(view3d.result.current.docked).toBe(false);
    act(() => view3d.result.current.onDockedChange(true));
    expect(view2d.result.current.docked).toBe(true);
  });
});
