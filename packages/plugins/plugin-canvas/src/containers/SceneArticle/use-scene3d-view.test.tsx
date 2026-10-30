//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { act, renderHook } from '@testing-library/react';
import * as Registry from 'effect/reactivity/AtomRegistry';
import React, { type PropsWithChildren } from 'react';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { ViewState, ViewStateProvider, createDefaultBackends } from '@dxos/react-ui-attention';
import { Scene } from '@dxos/scene';

import { makeCanvas } from '#model';

import { useScene3DView } from './use-scene3d-view.ts';

/** One viewer: its own registry and view-state manager. */
const viewer = () => {
  const registry = Registry.make();
  const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
  return ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>
      <ViewStateProvider manager={manager}>{children}</ViewStateProvider>
    </RegistryContext.Provider>
  );
};

const ORBITED: Scene.Camera3D = {
  target: { x: 1, y: 0, z: 0 },
  yaw: 45,
  pitch: 20,
  distance: 8,
  fov: 0.8,
  projection: 'perspective',
};

describe('useScene3DView', () => {
  test("an orbit is the viewer's view state: the scene's camera is unchanged, and reopening restores the orbit", () => {
    const { canvas, scene } = makeCanvas({ dimension: '3d' });
    const authored = Obj.instanceOf(Scene.Scene3D, scene) ? { ...scene.camera } : undefined;
    const wrapper = viewer();
    const first = renderHook(() => useScene3DView(canvas), { wrapper });
    expect(first.result.current.camera).toBeUndefined();
    act(() => first.result.current.onCameraChange(ORBITED));
    expect(first.result.current.camera).toEqual(ORBITED);
    expect(Obj.instanceOf(Scene.Scene3D, scene) && scene.camera).toEqual(authored);
    first.unmount();
    expect(renderHook(() => useScene3DView(canvas), { wrapper }).result.current.camera).toEqual(ORBITED);
  });

  test("one viewer's orbit leaves another viewer's view alone", () => {
    const { canvas } = makeCanvas({ dimension: '3d' });
    const mine = renderHook(() => useScene3DView(canvas), { wrapper: viewer() });
    const theirs = renderHook(() => useScene3DView(canvas), { wrapper: viewer() });
    act(() => mine.result.current.onCameraChange(ORBITED));
    expect(theirs.result.current.camera).toBeUndefined();
  });

  test("the grid and theme are the viewer's own, and the grid starts shown", () => {
    const { canvas } = makeCanvas({ dimension: '3d' });
    const wrapper = viewer();
    const mine = renderHook(() => useScene3DView(canvas), { wrapper });
    const theirs = renderHook(() => useScene3DView(canvas), { wrapper: viewer() });
    expect(mine.result.current.grid).toBe(true);
    expect(mine.result.current.theme).toBeUndefined();
    act(() => {
      mine.result.current.onGridChange(false);
      mine.result.current.onThemeChange('presentation');
    });
    expect(mine.result.current.grid).toBe(false);
    expect(mine.result.current.theme).toBe('presentation');
    mine.unmount();
    const again = renderHook(() => useScene3DView(canvas), { wrapper });
    expect(again.result.current.grid).toBe(false);
    expect(theirs.result.current.grid).toBe(true);
  });

  test("snapping and axes are the viewer's own: snap follows the grid until set, axes start hidden", () => {
    const { canvas } = makeCanvas({ dimension: '3d' });
    const wrapper = viewer();
    const mine = renderHook(() => useScene3DView(canvas), { wrapper });
    expect(mine.result.current.snap).toBe(true);
    expect(mine.result.current.axes).toBe(false);
    act(() => {
      mine.result.current.onSnapChange(false);
      mine.result.current.onAxesChange(true);
    });
    mine.unmount();
    const again = renderHook(() => useScene3DView(canvas), { wrapper });
    expect(again.result.current.snap).toBe(false);
    expect(again.result.current.axes).toBe(true);
    expect(again.result.current.grid).toBe(true);
  });
});
