//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Obj } from '@dxos/echo';
import { type CursorPoint, type CursorProjection, RemoteCursorLayer } from '@dxos/react-ui-attention';
import { type Camera, sceneToScreen, screenToScene, useCanvasNavigation } from '@dxos/react-ui-canvas';

export type CanvasCursorsProps = {
  object: Obj.Unknown;
};

/** The viewport's pixels are the layer's: both cover the canvas root, under which the camera transform is drawn. */
const makeProjection = (camera: Camera): CursorProjection => ({
  fromLayer: (point) => screenToScene(camera, point),
  toLayer: (point) => sceneToScreen(camera, point),
});

/**
 * Collaborators' pointers over the 2D viewport, shared in scene coordinates so peers with different pan and zoom
 * agree, and only among peers in the same drilled-in view. Must render inside `Canvas.Root`, as a viewport child.
 */
export const CanvasCursors = ({ object }: CanvasCursorsProps) => {
  const navigation = useCanvasNavigation('CanvasCursors');
  const camera = useAtomValue(navigation.atoms.camera);
  const path = useAtomValue(navigation.atoms.path);
  // The whole path, root layout included: peers on different scenes of one canvas share no view.
  const view = path.length > 0 ? path.join('/') : undefined;
  const { cursors, update } = ToolkitHooks.usePointerCursors(object);
  // A point published in the view being left would stay over it for its peers until the pointer moved again.
  useEffect(() => () => update(undefined), [view, update]);
  const shown = useMemo(() => cursors.filter((cursor) => cursor.view === view), [cursors, view]);
  const projection = useMemo(() => makeProjection(camera), [camera]);
  const handlePointerChange = useCallback(
    // An absent `view` must stay absent: a JSON round trip turns `undefined` into `null`, which peers reject.
    (point: CursorPoint | undefined) => update(point && (view === undefined ? point : { ...point, view })),
    [update, view],
  );
  return <RemoteCursorLayer cursors={shown} projection={projection} onPointerChange={handlePointerChange} />;
};
