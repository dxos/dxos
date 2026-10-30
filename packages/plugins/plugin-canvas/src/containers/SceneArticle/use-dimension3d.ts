//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { type EditorDisplay } from '@dxos/react-ui-canvas/scene';
import { CATALOGS_3D, config3d, isTheme3D } from '@dxos/react-ui-scene';
import { type Scene } from '@dxos/scene';

import { type Canvas } from '#types';

import { type SceneDimension } from './dimension.ts';
import { useScene3DView } from './use-scene3d-view.ts';

/**
 * A 3D canvas's dimension: the 3D config, with the orbit, grid, snapping and look this viewer's own view and the
 * scene's camera and theme the authored ones.
 */
export const useDimension3D = (
  canvas: Canvas.Canvas,
  scene: Scene.Scene3D | undefined,
  authoredTheme: string | undefined,
): SceneDimension<Scene.Camera3D> => {
  const view = useScene3DView(canvas);
  const display = useMemo<EditorDisplay>(
    () => ({
      theme: view.theme ?? (isTheme3D(authoredTheme) ? authoredTheme : 'cad'),
      themeOverride: view.theme,
      grid: view.grid,
      snap: view.snap,
      axes: view.axes,
    }),
    [view.theme, view.grid, view.snap, view.axes, authoredTheme],
  );
  const onDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => {
      'themeOverride' in next && view.onThemeChange(isTheme3D(next.themeOverride) ? next.themeOverride : undefined);
      next.grid !== undefined && view.onGridChange(next.grid);
      next.snap !== undefined && view.onSnapChange(next.snap);
      next.axes !== undefined && view.onAxesChange(next.axes);
    },
    [view],
  );
  return {
    config: config3d,
    display,
    onDisplayChange,
    camera: view.camera,
    authoredCamera: scene?.camera,
    onCameraChange: view.onCameraChange,
    catalogs: CATALOGS_3D,
  };
};
