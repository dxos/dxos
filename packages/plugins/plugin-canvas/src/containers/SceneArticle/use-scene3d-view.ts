//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { Entity } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type Scene } from '@dxos/scene';

import { type Canvas } from '#types';

import { scene3dViewAspect } from './view-state.ts';

type Theme3D = 'cad' | 'presentation';

export type Scene3DView = {
  camera: Scene.Camera3D | undefined;
  onCameraChange: (camera: Scene.Camera3D) => void;
  grid: boolean;
  onGridChange: (grid: boolean) => void;
  snap: boolean;
  onSnapChange: (snap: boolean) => void;
  /** The look picked over the scene's own; undefined until picked. */
  theme: Theme3D | undefined;
  onThemeChange: (theme: Theme3D | undefined) => void;
};

/**
 * The viewer's own view of a 3D canvas: the camera (undefined until they orbit, when the scene's authored camera shows),
 * the ground grid and the look. All of it is this viewer's view state, never the scene, so peers and the animator keep
 * their views.
 */
export const useScene3DView = (canvas: Canvas.Canvas): Scene3DView => {
  const contextId = Entity.getURI(canvas);
  const { camera, grid = true, snap = grid, theme } = useViewState(scene3dViewAspect, contextId);
  const { update } = useViewStateActions(scene3dViewAspect, contextId);
  const onCameraChange = useCallback(
    (next: Scene.Camera3D) => update((state) => ({ ...state, camera: { ...next, target: { ...next.target } } })),
    [update],
  );
  const onGridChange = useCallback((next: boolean) => update((state) => ({ ...state, grid: next })), [update]);
  const onSnapChange = useCallback((next: boolean) => update((state) => ({ ...state, snap: next })), [update]);
  const onThemeChange = useCallback(
    (next: Theme3D | undefined) =>
      update(({ theme: _theme, ...state }) => (next === undefined ? state : { ...state, theme: next })),
    [update],
  );
  return { camera, onCameraChange, grid, onGridChange, snap, onSnapChange, theme, onThemeChange };
};
