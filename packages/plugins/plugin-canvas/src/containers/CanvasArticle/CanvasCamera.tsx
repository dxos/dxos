//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { useEffect, useRef } from 'react';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { ViewLocation } from '@dxos/react-ui-attention/types';
import { screenToScene, useCanvasGesture, useCanvasNavigation } from '@dxos/react-ui-canvas';

import { cameraRequestAspect, formatCameraAnchor } from './view-state.ts';

export type CanvasCameraProps = {
  /** The view's attendable id: a graph path naming the drawing. */
  attendableId: string;
};

/**
 * Reports where this 2D view looks as its presence location, and shows the camera a reveal asks for (a peer's Jump or
 * follow), each as the scene point at the view's centre and the zoom, so views of any size agree. Only the scene's own
 * layout counts: a drilled-in view is not one a peer can share. Must render inside `Canvas.Root`.
 */
export const CanvasCamera = ({ attendableId }: CanvasCameraProps) => {
  const navigation = useCanvasNavigation('CanvasCamera');
  const { viewport, measured } = useCanvasGesture('CanvasCamera');
  const camera = useAtomValue(navigation.atoms.camera);
  const path = useAtomValue(navigation.atoms.path);
  const atRoot = path.length <= 1;
  const presenceKey = GraphPath.getEidFromPath(attendableId);
  const { set: setLocation } = useViewStateActions(ViewLocation.aspect, presenceKey);

  useEffect(() => {
    if (measured && atRoot) {
      const centre = screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 });
      setLocation({ viewport: formatCameraAnchor({ ...centre, zoom: camera.zoom }) });
    }
  }, [measured, atRoot, camera, viewport.width, viewport.height, setLocation]);

  const request = useViewState(cameraRequestAspect, attendableId);
  const applied = useRef(request.seq);
  useEffect(() => {
    if (!measured || !request.centre || request.seq === applied.current) {
      return;
    }
    applied.current = request.seq;
    const { x, y, zoom } = request.centre;
    navigation.commands.centreOn({ x, y }, zoom);
    if (request.focus) {
      document
        .querySelector<HTMLElement>(`[data-attendable-id="${CSS.escape(attendableId)}"] [data-testid="scene-view"]`)
        ?.focus();
    }
  }, [measured, request, navigation, attendableId]);

  return null;
};
