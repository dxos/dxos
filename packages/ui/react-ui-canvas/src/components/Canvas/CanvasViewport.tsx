//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useMemo } from 'react';

import * as Menu from '@dxos/react-ui/Menu';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';
import { mx } from '@dxos/ui-theme';

import { isMoving } from '../../engine/index.ts';
import { useChanging } from '../../hooks/index.ts';
import {
  type Bounds,
  type ElementId,
  MAJOR_GRID_RATIO,
  PLAIN_BACKGROUND,
  frameTimeAttribute,
  isFrameNode,
  isInstanceNode,
  nodeDef,
} from '../../model/index.ts';
import {
  GRID_CLASSES,
  MIN_ZOOM,
  boundsFromPoints,
  cameraTransform,
  enterPortal,
  layerOpacity,
  nodeBounds,
  sceneToScreen,
  screenBounds,
  screenToScene,
  visibleScene,
} from '../../utils/index.ts';
import {
  BackgroundField,
  BackgroundFill,
  GrainOverlay,
  WashCanvas,
  backgroundField,
  drawsField,
  supportsWashCanvas,
} from '../Background/index.ts';
import { ControlFrame } from '../ControlFrame/index.ts';
import { GridComponent } from '../Grid/index.ts';
import { LatticeGrid } from '../LatticeGrid/index.ts';
import { MAX_LIVE_DEPTH, SceneLayer } from '../SceneLayer/index.ts';
import {
  useCanvasEditing,
  useCanvasGesture,
  useCanvasLook,
  useCanvasNavigation,
  useCanvasSelection,
  useCanvasServices,
  useCanvasTime,
  useCanvasTools,
} from './CanvasContext.ts';
import { DOTS_RANGE, ZOOM_SETTLE } from './constants.ts';
import { PREVIEW_NODE_ID } from './usePointerMachine.ts';
import { GRID_LEVELS, GRID_RANGE } from './useSceneSnap.ts';

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
  const { registry, atoms, store, capabilities, readonly, projection, nodeRegistry, grid, objectActions } =
    useCanvasServices('Canvas.Viewport');
  const {
    displayScene,
    blocked,
    bounds,
    measured,
    viewport,
    createFrame,
    landing,
    handlers,
    navigating,
    opening,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
    removePoint,
    menu,
    closeMenu,
    menuAnchorRef,
  } = useCanvasGesture('Canvas.Viewport');
  const { look: viewLook } = useCanvasLook('Canvas.Viewport');
  const navigation = useCanvasNavigation('Canvas.Viewport');
  const tools = useCanvasTools('Canvas.Viewport');
  const selectionAspect = useCanvasSelection('Canvas.Viewport');
  const editingAspect = useCanvasEditing('Canvas.Viewport');
  const timeAspect = useCanvasTime('Canvas.Viewport');
  const snapEnabled = useAtomValue(tools.atoms.snap);
  const guides = useAtomValue(tools.atoms.guides);
  const latticeOn = useAtomValue(tools.atoms.lattice);
  const debug = useAtomValue(tools.atoms.debug);
  const selection = useAtomValue(selectionAspect.atoms.selection);
  const linkHover = useAtomValue(selectionAspect.atoms.linkHover);
  const editing = useAtomValue(editingAspect.atoms.editing);
  const active = useAtomValue(editingAspect.atoms.active);
  const clipboard = useAtomValue(editingAspect.atoms.clipboard);
  const isolation = useAtomValue(navigation.atoms.isolation);
  const time = useAtomValue(timeAspect.atoms.time);
  const drag = useAtomValue(atoms.drag);
  const { generated } = timeAspect;
  const { copy, cut, paste } = editingAspect.commands;
  const { drillIn, childFrame } = navigation.commands;
  const camera = useAtomValue(navigation.atoms.camera);
  const hover = useAtomValue(selectionAspect.atoms.hover);
  const selectedPoint = useAtomValue(selectionAspect.atoms.point);
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
      if (!isFrameNode(node) || nodeDef(nodeRegistry, node)?.hostOpen?.(node)) {
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

  /** One screen pixel in scene units, for chrome that should not grow with the camera. */
  const frameUnit = 1 / Math.max(camera.zoom, MIN_ZOOM);
  // The one instance selected, which the element menu offers to edit, ungroup or make unique.
  const selectedInstance = useMemo(() => {
    const [only] = selection.size === 1 ? [...selection] : [];
    const node = only === undefined ? undefined : displayScene.nodes[only];
    return node && isInstanceNode(node) ? node : undefined;
  }, [selection, displayScene]);
  // In isolation a composite is drawn on a plain surface, as if inside its own frame (ANIMATION.md §4.3).
  const look = useMemo(
    () => (isolation ? { ...viewLook, background: { ...PLAIN_BACKGROUND, grid: viewLook.background.grid } } : viewLook),
    [isolation, viewLook],
  );

  // Handles and ports belong to what is drawn: a hidden layer's elements show none.
  const shownScene = useMemo(() => visibleScene(displayScene), [displayScene]);

  const field = useMemo(
    () => backgroundField(look.background, backgroundBounds ?? bounds, latticeBounds),
    [look.background, backgroundBounds, bounds, latticeBounds],
  );
  const zooming = useChanging(camera.zoom, ZOOM_SETTLE);
  // While editing with snap on, a lines grid is the snap grid, which adapts its levels to the zoom, so the field draws
  // no lines too; with snap off, or on a lattice scene that snaps to its cells, the field draws the lines itself.
  const snapLines = !readonly && look.background.grid === 'lines';
  const snapGridDrawn = snapEnabled && snapLines && !(latticeOn && projection.lattice);
  // Dots are drawn in screen space, as the snap grid is, so they hold their size and keep showing while the camera moves.
  const dotsDrawn = look.background.grid === 'dots';
  // As a frame grows to fill the view the canvas's grid fades and the frame's own scene grid fades in inside it, mapped
  // as drilling in maps the scene, so the drill crossfades into the grid the scene then shows rather than swapping.
  const focusNode = focus && focus.opacity < 1 ? displayScene.nodes[focus.id] : undefined;
  const focusPortal = focusNode && isFrameNode(focusNode) ? focusNode : undefined;
  const focusScene = useAtomValue(store.scene(focusPortal?.scene ?? ''));
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
      ...((snapGridDrawn || dotsDrawn) && { grid: 'none' as const }),
      ...(gpuWashes && { washes: [] }),
    }),
    [snapGridDrawn, dotsDrawn, gpuWashes, look.background],
  );

  return (
    <>
      {gpuWashes ? (
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
      <div
        className={mx('absolute pointer-events-none', !measured && 'invisible')}
        style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
        // The time the scene below was sampled at, committed with it: a frame renderer waits until it matches.
        data-frame-time={frameTimeAttribute(time)}
      >
        {/* A lattice scene shows its cells: the places a shape may land, separated by the gutters. */}
        {guides && !readonly && latticeOn && projection.lattice && (
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
            editing={editing}
            active={active}
            ghost={drag?.kind === 'create' ? PREVIEW_NODE_ID : undefined}
            debug={debug}
            handlers={handlers}
            // Routes follow the gutters in lattice mode, whether or not snap is on.
            lattice={latticeOn ? projection.lattice : undefined}
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
            lattice={latticeOn ? projection.lattice : undefined}
            onHandlePointerDown={onHandlePointerDown}
            onPortPointerDown={onPortPointerDown}
            onEndPointerDown={onEndPointerDown}
            onPointPointerDown={onPointPointerDown}
            onMidpointPointerDown={onMidpointPointerDown}
            onPointContextMenu={onPointContextMenu}
          />
        )}
        {overlay}
      </div>
      <GrainOverlay background={look.background} offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }} />
      {/* Wheel events still bubble to the root through the shield, so a zoom keeps zooming. */}
      {navigating && <div className='dx-cover' data-testid='navigation-shield' />}
      <span
        ref={menuAnchorRef}
        className='absolute size-0 pointer-events-none'
        style={{ left: menu?.at.x ?? 0, top: menu?.at.y ?? 0 }}
      />
      <Menu.Root
        open={menu !== undefined}
        onOpenChange={({ open }) => !open && closeMenu()}
        positioning={{
          ...VirtualAnchor.virtualAnchor(menuAnchorRef),
          placement: 'right',
          gutter: 4,
          overflowPadding: 8,
        }}
      >
        <Menu.Content>
          {menu?.kind === 'point' && (
            <Menu.Item
              data-testid='remove-point'
              onSelect={() => {
                const point = registry.get(atoms.point);
                if (point) {
                  removePoint(point);
                }
              }}
              item={{ value: 'Remove control point', label: 'Remove control point' }}
            />
          )}
          {menu?.kind === 'element' && (
            <>
              <Menu.Item
                data-testid='menu-cut'
                disabled={!capabilities.delete}
                onSelect={cut}
                item={{ value: 'Cut', label: 'Cut' }}
              />
              <Menu.Item data-testid='menu-copy' onSelect={copy} item={{ value: 'Copy', label: 'Copy' }} />
              <Menu.Item
                data-testid='menu-delete'
                disabled={!capabilities.delete}
                onSelect={selectionAspect.commands.delete}
                item={{ value: 'Delete', label: 'Delete' }}
              />
              <Menu.Separator />
              <Menu.Item
                data-testid='menu-compose'
                disabled={!capabilities.create || !capabilities.delete}
                onSelect={objectActions.compose}
                item={{ value: 'Group as object', label: 'Group as object' }}
              />
              {selectedInstance && (
                <>
                  <Menu.Item
                    data-testid='menu-edit-object'
                    onSelect={() => drillIn(selectedInstance)}
                    item={{ value: 'Edit object', label: 'Edit object' }}
                  />
                  <Menu.Item
                    data-testid='menu-ungroup'
                    disabled={!capabilities.create || !capabilities.delete}
                    onSelect={() => objectActions.ungroup(selectedInstance.id)}
                    item={{ value: 'Ungroup', label: 'Ungroup' }}
                  />
                  <Menu.Item
                    data-testid='menu-make-unique'
                    disabled={!capabilities.update}
                    onSelect={() => objectActions.makeUnique(selectedInstance.id)}
                    item={{ value: 'Make unique', label: 'Make unique' }}
                  />
                </>
              )}
            </>
          )}
          {menu?.kind === 'canvas' && (
            <Menu.Item
              data-testid='menu-paste'
              disabled={!clipboard || !capabilities.create}
              onSelect={() => paste(menu.scene)}
              item={{ value: 'Paste', label: 'Paste' }}
            />
          )}
        </Menu.Content>
      </Menu.Root>
    </>
  );
};

CanvasViewport.displayName = 'Canvas.Viewport';
