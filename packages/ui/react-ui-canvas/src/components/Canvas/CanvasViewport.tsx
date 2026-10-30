//
// Copyright 2026 DXOS.org
//

//
// The Viewport draws three layers in order: the background under the camera's grids, the scene under the camera
// transform, and the overlay over both. It derives what more than one of them reads (the camera, the look, the focus).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useMemo } from 'react';

import { type Bounds, type ElementId } from '@dxos/scene';

import { PLAIN_BACKGROUND, isViewNode, nodeDef } from '../../model/index.ts';
import { boundsFromPoints, layerOpacity, nodeBounds, sceneToScreen, screenToScene } from '../../utils/index.ts';
import { MAX_LIVE_DEPTH } from '../SceneLayer/index.ts';
import { useCanvasGesture, useCanvasLook, useCanvasNavigation, useCanvasServices } from './CanvasContext.ts';
import { ViewportBackground } from './ViewportBackground.tsx';
import { ViewportOverlay } from './ViewportOverlay.tsx';
import { ViewportScene } from './ViewportScene.tsx';

//
// Canvas
//

export type CanvasViewportProps = {
  /** Nested levels below the root that may mount live; deeper portals stay previews (decision 10). */
  liveDepth?: number;
  /** Extra layers drawn in scene coordinates under the camera, above the scene (e.g. a host's animations). */
  overlay?: ReactNode;
  /** What the background's field covers before its padding, in scene coordinates; the scene's bounds by default. */
  backgroundBounds?: Bounds;
};

/** The scene itself under the camera: the grid, the layer, the control frame and the menu a gesture opens. */
export const CanvasViewport = ({ liveDepth = MAX_LIVE_DEPTH, overlay, backgroundBounds }: CanvasViewportProps) => {
  const { nodeRegistry } = useCanvasServices('Canvas.Viewport');
  const { displayScene, viewport } = useCanvasGesture('Canvas.Viewport');
  const { look: viewLook } = useCanvasLook('Canvas.Viewport');
  const navigation = useCanvasNavigation('Canvas.Viewport');
  const camera = useAtomValue(navigation.atoms.camera);
  const isolation = useAtomValue(navigation.atoms.isolation);
  // Shapes may land on free cells beyond the scene's frame, so the cells cover what is in view; only the view,
  // since a union with a distant frame would exceed the grid's cell budget and hide the lattice.
  const latticeBounds = useMemo(
    () =>
      boundsFromPoints(
        screenToScene(camera, { x: 0, y: 0 }),
        screenToScene(camera, { x: viewport.width, y: viewport.height }),
      ),
    [camera, viewport],
  );
  // The portal on screen that fills most of the view; the rest of the layer fades as it grows, so zooming into
  // a scene (by wheel or drill-in) fades out what surrounds it and zooming out fades it back in.
  const focus = useMemo(() => {
    let best: { id: ElementId; opacity: number } | undefined;
    for (const node of Object.values(displayScene.nodes)) {
      // A frame the host opens itself (one showing an object) is no scene to zoom into, so it keeps its frame.
      if (!isViewNode(node) || nodeDef(nodeRegistry, node)?.hostOpen?.(node)) {
        continue;
      }
      const bounds = nodeBounds(node);
      const centre = sceneToScreen(camera, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
      if (centre.x < 0 || centre.y < 0 || centre.x > viewport.width || centre.y > viewport.height) {
        continue;
      }
      const opacity = layerOpacity(camera, bounds, viewport);
      if (!best || opacity < best.opacity) {
        best = { id: node.id, opacity };
      }
    }
    return best;
  }, [displayScene.nodes, nodeRegistry, camera, viewport]);

  // In isolation a composite is drawn on a plain surface, as if inside its own frame (ANIMATION.md §4.3).
  const look = useMemo(
    () => (isolation ? { ...viewLook, background: { ...PLAIN_BACKGROUND, grid: viewLook.background.grid } } : viewLook),
    [isolation, viewLook],
  );

  return (
    <>
      <ViewportBackground
        camera={camera}
        look={look}
        latticeBounds={latticeBounds}
        focus={focus}
        backgroundBounds={backgroundBounds}
      />
      <ViewportScene
        camera={camera}
        latticeBounds={latticeBounds}
        focus={focus}
        liveDepth={liveDepth}
        overlay={overlay}
      />
      <ViewportOverlay camera={camera} look={look} />
    </>
  );
};

CanvasViewport.displayName = 'Canvas.Viewport';
