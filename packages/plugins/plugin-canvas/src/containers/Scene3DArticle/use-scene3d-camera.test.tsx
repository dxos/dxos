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

import { useScene3DCamera } from './use-scene3d-camera.ts';

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

describe('useScene3DCamera', () => {
  test("an orbit is the viewer's view state: the scene's camera is unchanged, and reopening restores the orbit", () => {
    const { canvas, scene } = makeCanvas({ dimension: '3d' });
    const authored = Obj.instanceOf(Scene.Scene3D, scene) ? { ...scene.camera } : undefined;
    const wrapper = viewer();
    const first = renderHook(() => useScene3DCamera(canvas), { wrapper });
    expect(first.result.current.camera).toBeUndefined();
    act(() => first.result.current.onCameraChange(ORBITED));
    expect(first.result.current.camera).toEqual(ORBITED);
    expect(Obj.instanceOf(Scene.Scene3D, scene) && scene.camera).toEqual(authored);
    first.unmount();
    expect(renderHook(() => useScene3DCamera(canvas), { wrapper }).result.current.camera).toEqual(ORBITED);
  });

  test("one viewer's orbit leaves another viewer's view alone", () => {
    const { canvas } = makeCanvas({ dimension: '3d' });
    const mine = renderHook(() => useScene3DCamera(canvas), { wrapper: viewer() });
    const theirs = renderHook(() => useScene3DCamera(canvas), { wrapper: viewer() });
    act(() => mine.result.current.onCameraChange(ORBITED));
    expect(theirs.result.current.camera).toBeUndefined();
  });
});
