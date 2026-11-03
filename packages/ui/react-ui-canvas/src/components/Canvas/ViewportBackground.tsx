//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { type Bounds, type ElementId, isViewNode } from '@dxos/scene';

import { GRID_LEVELS, GRID_RANGE, useChanging } from '../../hooks/index.ts';
import { type Camera, type SceneLook } from '../../model/index.ts';
import { GRID_CLASSES, cameraTransform, enterPortal, nodeBounds, screenBounds } from '../../utils/index.ts';
import {
  BackgroundField,
  BackgroundFill,
  WashCanvas,
  backgroundField,
  drawsField,
  supportsWashCanvas,
} from '../Background/index.ts';
import { GridComponent } from '../Grid/index.ts';
import { useCanvasGesture, useCanvasNavigation, useCanvasServices, useCanvasTools } from './CanvasContext.ts';
import { DOTS_RANGE, ZOOM_SETTLE } from './constants.ts';

export type ViewportBackgroundProps = {
  camera: Camera;
  look: SceneLook;
  /** The stretch of the scene in view. */
  latticeBounds: Bounds;
  /** The portal filling most of the view, and how far the rest of the layer has faded around it. */
  focus: { id: ElementId; opacity: number } | undefined;
  /** What the background's field covers before its padding; the scene's bounds by default. */
  backgroundBounds?: Bounds;
};

/** Under the scene: the surface and its washes, the background's field and the grids drawn in screen space. */
export const ViewportBackground = ({
  camera,
  look,
  latticeBounds,
  focus,
  backgroundBounds,
}: ViewportBackgroundProps) => {
  const { store, readonly, transparent, draw, grid } = useCanvasServices('Canvas.Viewport');
  const { displayScene, bounds, measured } = useCanvasGesture('Canvas.Viewport');
  const tools = useCanvasTools('Canvas.Viewport');
  const { childFrame } = useCanvasNavigation('Canvas.Viewport').commands;
  const snapEnabled = useAtomValue(tools.atoms.snap);
  const axesShown = useAtomValue(tools.atoms.axes);
  const field = useMemo(
    () => backgroundField(look.background, backgroundBounds ?? bounds, latticeBounds),
    [look.background, backgroundBounds, bounds, latticeBounds],
  );
  const zooming = useChanging(camera.zoom, ZOOM_SETTLE);
  // While editing with snap on, a lines grid is the snap grid, which adapts its levels to the zoom, so the field draws
  // no lines too; with snap off, or on a lattice scene that snaps to its cells, the field draws the lines itself.
  const snapLines = !readonly && look.background.grid === 'lines';
  const snapGridDrawn = snapEnabled && snapLines && !draw.lattice;
  // Dots are drawn in screen space, as the snap grid is, so they hold their size and keep showing while the camera moves.
  // A lattice scene shows its cells instead, which are what a shape lands on, so it draws no dots or lines at all.
  const latticeScene = draw.lattice !== undefined;
  const dotsDrawn = look.background.grid === 'dots' && !latticeScene;
  // As a frame grows to fill the view the canvas's grid fades and the frame's own scene grid fades in inside it, mapped
  // as drilling in maps the scene, so the drill crossfades into the grid the scene then shows rather than swapping.
  const focusNode = focus && focus.opacity < 1 ? displayScene.nodes[focus.id] : undefined;
  const focusPortal = focusNode && isViewNode(focusNode) ? focusNode : undefined;
  const focusScene = useAtomValue(store.view(focusPortal?.scene ?? ''));
  const subGrid = useMemo(() => {
    if (!focus || !focusPortal || !focusScene) {
      return undefined;
    }
    const rect = screenBounds(camera, nodeBounds(focusPortal));
    const inner = enterPortal(camera, focusPortal, childFrame(focusPortal, focusScene));
    return {
      rect,
      zoom: inner.zoom,
      offset: { x: inner.x * inner.zoom - rect.x, y: inner.y * inner.zoom - rect.y },
      opacity: 1 - focus.opacity,
    };
  }, [focus, focusPortal, focusScene, camera, childFrame]);
  const gridOpacity = subGrid ? 1 - subGrid.opacity : undefined;
  // With WebGL, the surface and washes are drawn per pixel on the GPU (smooth, with no grain needed); the SVG field then
  // draws only the grid. Without it (a test DOM), the SVG draws the washes as before.
  const gpuWashes = look.background.washes.length > 0 && supportsWashCanvas();
  const fieldBackground = useMemo(
    () => ({
      ...look.background,
      ...((snapGridDrawn || dotsDrawn || latticeScene) && { grid: 'none' as const }),
      // Transparent draws no surface, so it draws no washes either, though the grid stays.
      ...((gpuWashes || transparent) && { washes: [] }),
    }),
    [snapGridDrawn, dotsDrawn, latticeScene, gpuWashes, transparent, look.background],
  );

  return (
    <>
      {transparent ? null : gpuWashes ? (
        <WashCanvas background={look.background} field={field} camera={camera} />
      ) : (
        <BackgroundFill background={look.background} />
      )}
      {/* Under the snap grid, in its own camera layer, so the grid a gesture lands on stays on top. */}
      {measured && drawsField(fieldBackground) && (
        <div
          className='absolute pointer-events-none'
          style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
        >
          <BackgroundField
            background={fieldBackground}
            tone={look.tone}
            field={field}
            grid={grid}
            gridHidden={zooming}
          />
        </div>
      )}
      {/* Only while snapping: the lines are what a gesture lands on, so drawing them when nothing snaps
          states a constraint the canvas is not applying. The minor level goes when its cells get too
          small to read. Read-only, nothing snaps, so neither grid nor guides are drawn. A lattice scene snaps to its
          cells, not the lines, so its cells are its grid. The theme bar's grid choice decides whether they show. */}
      {snapGridDrawn && (
        <GridComponent
          size={grid}
          scale={camera.zoom}
          offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
          showAxes={false}
          ratios={GRID_LEVELS}
          range={GRID_RANGE}
          opacity={gridOpacity}
        />
      )}
      {measured && dotsDrawn && (
        <GridComponent
          variant='dots'
          dotsClassName={GRID_CLASSES[look.tone].dots}
          size={grid}
          scale={camera.zoom}
          offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
          showAxes={false}
          ratios={GRID_LEVELS}
          range={DOTS_RANGE}
          opacity={gridOpacity}
          fade={
            look.background.fade
              ? {
                  x: (field.x + camera.x) * camera.zoom,
                  y: (field.y + camera.y) * camera.zoom,
                  width: field.width * camera.zoom,
                  height: field.height * camera.zoom,
                }
              : undefined
          }
        />
      )}
      {/* The axes through the origin, in the grid's colour but stronger; whatever grid is drawn, or none. */}
      {measured && axesShown && (
        <GridComponent
          scale={camera.zoom}
          offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
          showAxes
          ratios={[]}
          opacity={gridOpacity}
        />
      )}
      {measured && subGrid && (snapGridDrawn || dotsDrawn) && (
        <div
          className='absolute overflow-hidden pointer-events-none'
          style={{ left: subGrid.rect.x, top: subGrid.rect.y, width: subGrid.rect.width, height: subGrid.rect.height }}
        >
          <GridComponent
            variant={dotsDrawn ? 'dots' : 'lines'}
            dotsClassName={GRID_CLASSES[look.tone].dots}
            size={grid}
            scale={subGrid.zoom}
            offset={subGrid.offset}
            showAxes={false}
            ratios={GRID_LEVELS}
            range={dotsDrawn ? DOTS_RANGE : GRID_RANGE}
            opacity={subGrid.opacity}
          />
        </div>
      )}
    </>
  );
};
