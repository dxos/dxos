//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { Entity } from '@dxos/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type Scene } from '@dxos/scene';

import { type Canvas } from '#types';

import { scene3dViewAspect } from '../CanvasArticle/view-state.ts';

/**
 * The viewer's own camera on a 3D canvas: undefined until they orbit, when the scene's authored camera shows. Orbiting
 * writes only this viewer's view state, never the scene, so peers and the animator keep their views.
 */
export const useScene3DCamera = (
  canvas: Canvas.Canvas,
): { camera: Scene.Camera3D | undefined; onCameraChange: (camera: Scene.Camera3D) => void } => {
  const contextId = Entity.getURI(canvas);
  const { camera } = useViewState(scene3dViewAspect, contextId);
  const { update } = useViewStateActions(scene3dViewAspect, contextId);
  const onCameraChange = useCallback(
    (next: Scene.Camera3D) => update((state) => ({ ...state, camera: { ...next, target: { ...next.target } } })),
    [update],
  );
  return { camera, onCameraChange };
};
