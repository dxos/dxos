//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';

import { isMoving } from '../../engine/index.ts';
import { PREVIEW_NODE_ID } from '../../hooks/index.ts';
import { type Bounds, type Camera, type ElementId, MAJOR_GRID_RATIO, frameTimeAttribute } from '../../model/index.ts';
import { MIN_ZOOM, cameraTransform, visibleView } from '../../utils/index.ts';
import { ControlFrame } from '../ControlFrame/index.ts';
import { LatticeGrid } from '../LatticeGrid/index.ts';
import { SceneLayer } from '../SceneLayer/index.ts';
import {
  useCanvasEditing,
  useCanvasGesture,
  useCanvasSelection,
  useCanvasServices,
  useCanvasTime,
  useCanvasTools,
} from './CanvasContext.ts';

export type ViewportSceneProps = {
  camera: Camera;
  /** The stretch of the scene in view, which a lattice scene's cells cover. */
  latticeBounds: Bounds;
  /** The portal filling most of the view, and how far the rest of the layer has faded around it. */
  focus: { id: ElementId; opacity: number } | undefined;
  /** Nested levels below the root that may mount live. */
  liveDepth: number;
  /** Extra layers drawn in scene coordinates under the camera, above the scene. */
  overlay?: ReactNode;
};

/** The scene under the camera: the lattice, the layer and the control frame, sampled at the clock's time. */
export const ViewportScene = ({ camera, latticeBounds, focus, liveDepth, overlay }: ViewportSceneProps) => {
  const { atoms, store, capabilities, readonly, projection, nodeRegistry, grid } = useCanvasServices('Canvas.Viewport');
  const {
    displayScene,
    blocked,
    measured,
    createFrame,
    landing,
    handlers,
    opening,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
    onVertexPointerDown,
    onVertexMidpointPointerDown,
  } = useCanvasGesture('Canvas.Viewport');
  const tools = useCanvasTools('Canvas.Viewport');
  const selectionAspect = useCanvasSelection('Canvas.Viewport');
  const editingAspect = useCanvasEditing('Canvas.Viewport');
  const timeAspect = useCanvasTime('Canvas.Viewport');
  const guides = useAtomValue(tools.atoms.guides);
  const debug = useAtomValue(tools.atoms.debug);
  const selection = useAtomValue(selectionAspect.atoms.selection);
  const hover = useAtomValue(selectionAspect.atoms.hover);
  const linkHover = useAtomValue(selectionAspect.atoms.linkHover);
  const selectedPoint = useAtomValue(selectionAspect.atoms.point);
  const editing = useAtomValue(editingAspect.atoms.editing);
  const active = useAtomValue(editingAspect.atoms.active);
  const time = useAtomValue(timeAspect.atoms.time);
  const drag = useAtomValue(atoms.drag);
  const { generated } = timeAspect;

  /** One screen pixel in scene units, for chrome that should not grow with the camera. */
  const frameUnit = 1 / Math.max(camera.zoom, MIN_ZOOM);
  // Handles and ports belong to what is drawn: a hidden layer's elements show none.
  const shownScene = useMemo(() => visibleView(displayScene), [displayScene]);

  return (
    <div
      className={mx('absolute pointer-events-none', !measured && 'invisible')}
      style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
      // The time the scene below was sampled at, committed with it: a frame renderer waits until it matches.
      data-frame-time={frameTimeAttribute(time)}
    >
      {/* A lattice scene shows its cells: the places a shape may land, separated by the gutters. */}
      {guides && !readonly && projection.lattice && (
        <LatticeGrid spec={projection.lattice} bounds={latticeBounds} unit={frameUnit} />
      )}
      <div className='pointer-events-auto'>
        <SceneLayer
          store={store}
          scene={displayScene}
          registry={nodeRegistry}
          zoom={camera.zoom}
          depth={0}
          liveDepth={liveDepth}
          selected={selection}
          plain={isMoving(drag)}
          hover={hover}
          hoveredLink={linkHover}
          opening={opening}
          focus={focus}
          editing={editing?.kind === 'label' ? editing : undefined}
          dimmed={editing?.kind === 'vertices' ? editing.id : undefined}
          active={active}
          ghost={drag?.kind === 'create' ? PREVIEW_NODE_ID : undefined}
          debug={debug}
          handlers={handlers}
          // Routes follow the gutters in lattice mode, whether or not snap is on.
          lattice={projection.lattice}
          cell={grid * MAJOR_GRID_RATIO}
          generated={generated}
        />
      </div>
      {/* Read-only, nothing is edited, so no selection frame, handle or port is drawn. */}
      {!readonly && (
        <ControlFrame
          scene={shownScene}
          registry={nodeRegistry}
          selection={selection}
          hover={hover}
          hoveredLink={drag ? undefined : linkHover}
          onLinkHover={handlers.onLinkHover}
          selectedPoint={selectedPoint}
          zoom={camera.zoom}
          drag={drag}
          capabilities={capabilities}
          createFrame={createFrame}
          landing={landing}
          blocked={blocked}
          lattice={projection.lattice}
          onHandlePointerDown={onHandlePointerDown}
          onPortPointerDown={onPortPointerDown}
          onEndPointerDown={onEndPointerDown}
          onPointPointerDown={onPointPointerDown}
          onMidpointPointerDown={onMidpointPointerDown}
          onPointContextMenu={onPointContextMenu}
          vertexEditing={editing?.kind === 'vertices' ? editing : undefined}
          onVertexPointerDown={onVertexPointerDown}
          onVertexMidpointPointerDown={onVertexMidpointPointerDown}
        />
      )}
      {overlay}
    </div>
  );
};
