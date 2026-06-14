//
// Copyright 2026 DXOS.org
//

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { act, renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { describe, test } from 'vitest';

import { ViewStateManager, createDefaultBackends } from '../../view-state';
import { ViewStateProvider, useSelection, useSelectionActions } from './ViewStateProvider';

const wrapper =
  (manager: ViewStateManager, registry: Registry.Registry) =>
  ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>
      <ViewStateProvider manager={manager}>{children}</ViewStateProvider>
    </RegistryContext.Provider>
  );

describe('useSelection / useSelectionActions', () => {
  test('single select updates the resolved value', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewStateManager({ registry, backends: createDefaultBackends(registry) });
    const Wrapper = wrapper(manager, registry);
    const { result: value } = renderHook(() => useSelection('ctx', 'single'), { wrapper: Wrapper });
    const { result: actions } = renderHook(() => useSelectionActions('ctx'), { wrapper: Wrapper });
    expect(value.current).toBeUndefined();
    act(() => actions.current.single('item-1'));
    expect(value.current).toEqual('item-1');
  });

  test('toggle within multi selection', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewStateManager({ registry, backends: createDefaultBackends(registry) });
    const Wrapper = wrapper(manager, registry);
    const { result: value } = renderHook(() => useSelection('ctx', 'multi'), { wrapper: Wrapper });
    const { result: actions } = renderHook(() => useSelectionActions('ctx'), { wrapper: Wrapper });
    act(() => actions.current.toggle('a'));
    act(() => actions.current.toggle('b'));
    expect(value.current).toEqual(['a', 'b']);
    act(() => actions.current.toggle('a'));
    expect(value.current).toEqual(['b']);
  });
});
