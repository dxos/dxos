//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { Menu, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useRegistry, useSceneProjection, useViewport, useWheel } from '../../hooks/index.ts';
import { type Drag, type SceneViewAtoms, createSceneViewAtoms } from '../../model/atoms.ts';
import { isToolKey, keyAction } from '../../model/keys.ts';
import {
  type FreehandProjectionOptions,
  type Projection,
  readonlyCapabilities,
  reduceIntent,
} from '../../model/projection.ts';
import {
  type LinkRegistry,
  type NodeRegistry,
  defaultLinkRegistry,
  defaultNodeRegistry,
  nodeDef,
} from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  DEFAULT_GRID,
  type ElementId,
  type Endpoint,
  MAJOR_GRID_RATIO,
  type Node,
  type NodeType,
  type Scene,
  type SceneId,
  isPointEndpoint,
} from '../../model/types.ts';
import { MIN_ZOOM, cameraTransform, fitBounds, panBy, screenToScene, zoomAt } from '../../utils/camera.ts';
import { nodeDragType } from '../../utils/dnd.ts';
import { hitTest, unionBounds } from '../../utils/hit.ts';
import { topZ } from '../../utils/order.ts';
import { type PartKey, partKey, partText, partValues } from '../../utils/parts.ts';
import { createLink, nodeBounds } from '../../utils/shapes.ts';
import { redo, undo } from '../../utils/undo.ts';
import { ControlFrame } from '../ControlFrame/ControlFrame.tsx';
import { GridComponent } from '../Grid/index.ts';
import { Palette, toolForKey } from '../Palette/Palette.tsx';
import { type ElementHandlers, MAX_LIVE_DEPTH, SceneLayer } from '../SceneLayer/SceneLayer.tsx';
import { ActionToolbar, DebugToolbar, NavigationToolbar, type ToolbarActions } from '../Toolbar/Toolbar.tsx';
import { PREVIEW_NODE_ID, createId, usePointerMachine, viewSize } from './usePointerMachine.ts';
import { useSceneCamera } from './useSceneCamera.ts';
import { useSceneClipboard } from './useSceneClipboard.ts';
import { useSceneNavigation } from './useSceneNavigation.ts';
import { GRID_LEVELS, GRID_RANGE, useSceneSnap } from './useSceneSnap.ts';

/** Major cells between the scene's frame and the viewport edge when fitting; `margin` overrides it. */
const DEFAULT_MARGIN = 1;
/** Zoom factor of one toolbar step. */
const ZOOM_STEP = 1.25;
/** Length of a dash of the scene's frame, in screen px. */
const FRAME_DASH = 4;
/** The link drawn as a preview during a drag; it never reaches the model. */
const PREVIEW_LINK_ID = 'preview-link';

export type SceneViewProps = ThemedClassName<{
  store: SceneStore;
  root: SceneId;
  nodes?: NodeRegistry;
  links?: LinkRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** A host-owned projection instead, shared with the host's panels (see `useSceneProjection`). */
  projection?: Projection;
  /** Externally owned view state, e.g. to drive two views or persist the camera. */
  atoms?: SceneViewAtoms;
  /** Minor grid spacing in scene px; moves snap to it, creation and resizing to the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
  /** Least gap between the scene's frame and each viewport edge when fitting, in whole major cells. */
  margin?: number;
  /** Nested levels below the root that may mount live; deeper portals stay previews (decision 10). */
  liveDepth?: number;
  showPalette?: boolean;
  showToolbar?: boolean;
  /**
   * Look, select and navigate only: no gesture or key reaches the model, and no handle or port is drawn,
   * whatever the projection would allow.
   */
  readonly?: boolean;
  /** Extra layers drawn in scene coordinates under the camera, above the scene (e.g. a host's animations). */
  overlay?: ReactNode;
}>;

export const SceneView = ({
  classNames,
  store,
  root,
  nodes: nodeRegistry = defaultNodeRegistry,
  links: linkRegistry = defaultLinkRegistry,
  createProjection,
  projection: projectionProp,
  atoms: atomsProp,
  grid = DEFAULT_GRID,
  margin = DEFAULT_MARGIN,
  liveDepth = MAX_LIVE_DEPTH,
  showPalette = true,
  showToolbar = true,
  readonly = false,
  overlay,
}: SceneViewProps) => {
  const registry = useRegistry();
  const atoms = useMemo(() => atomsProp ?? createSceneViewAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  const projection = useSceneProjection({ store, atoms, createProjection, projection: projectionProp });
  const scene = useAtomValue(projection.scene);
  const scenes = useAtomValue(store.scenes);
  const camera = useAtomValue(atoms.camera);
  const selection = useAtomValue(atoms.selection);
  const hover = useAtomValue(atoms.hover);
  const selectedPoint = useAtomValue(atoms.point);
  const tool = useAtomValue(atoms.tool);
  const snapEnabled = useAtomValue(atoms.snap);
  // The margin is in major cells, taken from the model's grid rather than the level currently drawn,
  // so a fit puts the same gap around the scene whatever the zoom.
  const inset = margin * grid * MAJOR_GRID_RATIO;

  const drag = useAtomValue(atoms.drag);
  const undoState = useAtomValue(atoms.undo);
  const clipboard = useAtomValue(atoms.clipboard);
  const editing = useAtomValue(atoms.editing);
  const debug = useAtomValue(atoms.debug);
  const sceneId = path[path.length - 1];
  const canUndo = !readonly && undoState.key === sceneId && undoState.past.length > 0;
  const canRedo = !readonly && undoState.key === sceneId && undoState.future.length > 0;

  // Every gesture, key and control is gated on these, so a read-only view is the projection with nothing allowed.
  const capabilities = readonly ? readonlyCapabilities : projection.capabilities;

  //
  // Camera.
  //

  const {
    setCamera,
    animateTo,
    cancelAnimation,
    navigating,
    isNavigating,
    isAnimating,
    setNavigation,
    touchNavigation,
    opening,
    setOpening,
  } = useSceneCamera(registry, atoms, viewport);

  // Keep the scene fitted while the viewport settles, until the user takes the camera over. A layout
  // effect, so the fit lands before the first paint instead of one frame after it.
  const interactedRef = useRef(false);

  const select = useCallback(
    (ids: Iterable<ElementId>) => {
      registry.set(atoms.selection, new Set(ids));
      registry.set(atoms.point, undefined);
    },
    [registry, atoms.selection, atoms.point],
  );

  const { nameOf, portalTo, frameOf, bounds, nominalZoom, pushHistory, drillIn, drillOut, goHistory } =
    useSceneNavigation({
      registry,
      atoms,
      store,
      scenes,
      scene,
      path,
      camera,
      viewport,
      inset,
      drag,
      interactedRef,
      select,
      animateTo,
      setCamera,
      setOpening,
      isAnimating,
    });

  const measured = viewport.width > 0 && viewport.height > 0;
  useLayoutEffect(() => {
    if (!interactedRef.current && measured) {
      setCamera(fitBounds(bounds, viewport, inset));
    }
  }, [measured, viewport, bounds, inset, setCamera]);

  useWheel(
    rootRef,
    useCallback(
      (event, pointer) => {
        interactedRef.current = true;
        cancelAnimation();
        touchNavigation();
        if (event.ctrlKey || event.metaKey) {
          setCamera((camera) => zoomAt(camera, pointer, camera.zoom * Math.exp(-event.deltaY * 0.01)));
        } else {
          setCamera((camera) => panBy(camera, { x: -event.deltaX / camera.zoom, y: -event.deltaY / camera.zoom }));
        }
      },
      [setCamera, cancelAnimation, touchNavigation],
    ),
  );

  //
  // Navigation.
  //

  // Undo restores a whole model snapshot, so the selection may name elements that no longer exist.
  const onUndo = useCallback(() => {
    if (!readonly && undo(projection, registry, atoms.undo, sceneId)) {
      select([]);
    }
  }, [readonly, projection, registry, atoms.undo, sceneId, select]);
  const onRedo = useCallback(() => {
    if (!readonly && redo(projection, registry, atoms.undo, sceneId)) {
      select([]);
    }
  }, [readonly, projection, registry, atoms.undo, sceneId, select]);

  //
  // Pointer state machine.
  //

  const { major, snap, snapMinor } = useSceneSnap(grid, camera.zoom, snapEnabled);
  const toggleSnap = useCallback(() => registry.set(atoms.snap, !registry.get(atoms.snap)), [registry, atoms.snap]);
  const toggleDebug = useCallback(() => registry.set(atoms.debug, !registry.get(atoms.debug)), [registry, atoms.debug]);
  const {
    onBackgroundPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
    cancelDrag,
    updateHover,
    onNodePointerDown,
    onLinkPointerDown,
    onLinkDoubleClick,
    onLinkContextMenu,
    onHandlePointerDown,
    onPortPointerDown,
    onEndPointerDown,
    onPointPointerDown,
    onMidpointPointerDown,
    onPointContextMenu,
    setTool,
    setDrag,
    toScene,
    removePoint,
    createdNode,
    commitCreated,
    menu,
    closeMenu,
    menuAnchorRef,
  } = usePointerMachine({
    registry,
    atoms,
    store,
    scene,
    nodeRegistry,
    projection,
    capabilities,
    camera,
    rootRef,
    interactedRef,
    select,
    setCamera,
    cancelAnimation,
    isNavigating,
    major,
    snap,
    snapMinor,
  });

  //
  // Clipboard.
  //

  const { copy, cut, paste } = useSceneClipboard({
    registry,
    atoms,
    scene,
    projection,
    capabilities,
    select,
    createId,
    major,
    snap,
  });

  // Every chord comes from `KEY_BINDINGS`; this only decides what the action means in the current state.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const selected = [...registry.get(atoms.selection)];
      const selectedNodes = selected.filter((id) => scene.nodes[id] !== undefined);
      const point = registry.get(atoms.point);
      const action = keyAction(event);
      switch (action) {
        case 'cancel':
          if (registry.get(atoms.drag)) {
            cancelDrag();
          } else if (point) {
            registry.set(atoms.point, undefined);
          } else if (selected.length > 0) {
            select([]);
          } else {
            drillOut();
          }
          break;
        case 'delete':
          if (point) {
            removePoint(point);
          } else if (selected.length > 0 && capabilities.delete) {
            projection.apply({ kind: 'delete', ids: selected });
            select([]);
          }
          break;
        case 'open': {
          const node = selected.length === 1 ? scene.nodes[selected[0]] : undefined;
          if (node && nodeDef(nodeRegistry, node)?.openable) {
            drillIn(node);
          }
          break;
        }
        case 'fit':
          animateTo(fitBounds(bounds, viewport, inset));
          event.preventDefault();
          break;
        case 'fitSelection': {
          const union = unionBounds(selectedNodes.map((id) => nodeBounds(scene.nodes[id])));
          if (union) {
            animateTo(fitBounds(union, viewport, inset));
          }
          break;
        }
        case 'zoomReset':
          animateTo(zoomAt(registry.get(atoms.camera), { x: viewport.width / 2, y: viewport.height / 2 }, 1));
          break;
        case 'back':
          goHistory(-1);
          break;
        case 'forward':
          goHistory(1);
          break;
        case 'nudge': {
          if (selectedNodes.length === 0 || !capabilities.move) {
            break;
          }
          // Shift moves by a major cell rather than a minor one.
          const step = event.shiftKey ? major : grid;
          const delta = {
            x: event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
            y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
          };
          projection.apply({ kind: 'move', ids: selectedNodes, delta });
          event.preventDefault();
          break;
        }
        case 'copy':
          copy();
          event.preventDefault();
          break;
        case 'cut':
          cut();
          event.preventDefault();
          break;
        case 'paste':
          paste();
          event.preventDefault();
          break;
        case 'undo':
          onUndo();
          event.preventDefault();
          break;
        case 'redo':
          onRedo();
          event.preventDefault();
          break;
        case 'selectAll':
          select([...Object.keys(scene.nodes), ...Object.keys(scene.links)]);
          event.preventDefault();
          break;
        case 'snap':
          toggleSnap();
          break;
        case 'debug':
          toggleDebug();
          break;
        case undefined:
          if (isToolKey(event)) {
            const next = toolForKey(nodeRegistry, linkRegistry, capabilities, event.key);
            if (next) {
              setTool(next);
            }
          }
          break;
      }
    },
    [
      registry,
      atoms.selection,
      atoms.drag,
      atoms.camera,
      atoms.point,
      removePoint,
      setDrag,
      cancelDrag,
      select,
      drillOut,
      drillIn,
      capabilities,
      projection,
      scene,
      nodeRegistry,
      linkRegistry,
      animateTo,
      bounds,
      viewport,
      inset,
      goHistory,
      major,
      setTool,
      toggleSnap,
      toggleDebug,
      onUndo,
      onRedo,
      copy,
      cut,
      paste,
    ],
  );

  //
  // Render.
  //

  /** The node a create gesture would land while one is in flight; the ghost and the frame both read it. */
  const createPreview = useMemo(
    () => (drag?.kind === 'create' ? createdNode(drag, PREVIEW_NODE_ID) : undefined),
    [drag, createdNode],
  );

  // Transient drag state is rendered by projecting it onto a copy, so links re-route while dragging and
  // a link being drawn or re-attached over a drop target looks exactly as it will once dropped.
  const displayScene = useMemo<Scene>(() => {
    if (drag?.kind === 'move') {
      return reduceIntent(scene, { kind: 'move', ids: drag.ids, delta: drag.delta });
    }
    if (drag?.kind === 'resize') {
      return reduceIntent(scene, { kind: 'resize', id: drag.id, bounds: drag.bounds });
    }
    if (drag?.kind === 'point') {
      return reduceIntent(scene, { kind: 'update', id: drag.id, values: { points: drag.points } });
    }
    if (drag?.kind === 'link' && (drag.target || isPointEndpoint(drag.source))) {
      // A port drag previews once it reaches a target; a free-ended link previews as it will land.
      const link = createLink({
        type: drag.type,
        id: PREVIEW_LINK_ID,
        z: topZ(Object.values(scene.links)),
        source: drag.source,
        target: drag.target ?? { point: drag.to },
        midpoint: { x: (drag.from.x + drag.to.x) / 2, y: (drag.from.y + drag.to.y) / 2 },
      });
      return reduceIntent(scene, { kind: 'link', link });
    }
    if (drag?.kind === 'end') {
      // The link is drawn as it will land: re-attached over a target, free-ended over empty canvas.
      const end: Endpoint = drag.target ?? { point: drag.to };
      return reduceIntent(scene, { kind: 'update', id: drag.id, values: { [drag.end]: end } });
    }
    // A node drawn on the canvas previews as the type's own view; one dragged in from the palette shows
    // the frame alone, since the pointer is already carrying the palette's preview of it.
    if (drag?.kind === 'create') {
      return createPreview && !drag.dropped ? reduceIntent(scene, { kind: 'create', node: createPreview }) : scene;
    }
    return scene;
  }, [scene, drag, createPreview]);

  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  const createFrame = useMemo(() => (createPreview ? nodeBounds(createPreview) : undefined), [createPreview]);

  const onPartCommit = useCallback(
    (node: Node, part: PartKey, text: string) => {
      registry.set(atoms.editing, undefined);
      const values = partValues(node, part, text);
      if (values && capabilities.update && text !== partText(node, part)) {
        projection.apply({ kind: 'update', id: node.id, values });
      }
    },
    [registry, atoms.editing, capabilities.update, projection],
  );
  const onPartCancel = useCallback(() => registry.set(atoms.editing, undefined), [registry, atoms.editing]);

  const handlers = useMemo<ElementHandlers>(
    () => ({ onNodePointerDown, onLinkPointerDown, onLinkDoubleClick, onLinkContextMenu, onPartCommit, onPartCancel }),
    [onNodePointerDown, onLinkPointerDown, onLinkDoubleClick, onLinkContextMenu, onPartCommit, onPartCancel],
  );

  // Resolved at the root from the model: pointer capture during a drag retargets the click, so a
  // double-click never reaches the node element itself. A text part under the pointer opens its editor;
  // the DOM is asked only which part, and the node comes from the model, so a part of a nested (live)
  // scene never matches the root node over it.
  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const node = hitTest(scene, toScene(event));
      if (!node) {
        return;
      }
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const partElement = target instanceof Element ? target.closest('[data-part]') : null;
      const part =
        partElement?.closest('[data-node-id]')?.getAttribute('data-node-id') === node.id
          ? partKey(partElement?.getAttribute('data-part'))
          : undefined;
      if (part && capabilities.update && partText(node, part) !== undefined) {
        select([node.id]);
        registry.set(atoms.editing, { id: node.id, part });
      } else if (nodeDef(nodeRegistry, node)?.openable) {
        drillIn(node);
      }
    },
    [scene, toScene, nodeRegistry, drillIn, capabilities.update, select, registry, atoms.editing],
  );

  // A node type dragged in (from the palette or a host's draggable) previews as a create drag would and
  // lands through the same drop, so what the ghost shows is what is created.
  const onPointerUpRef = useRef(onPointerUp);
  onPointerUpRef.current = onPointerUp;
  useEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }
    const dragAt = (type: NodeType, input: { clientX: number; clientY: number }): Drag => {
      const point = toScene(input);
      const from = { x: snap(point.x), y: snap(point.y) };
      return { kind: 'create', type, from, to: from, dropped: true };
    };
    return dropTargetForElements({
      element,
      canDrop: ({ source }) => capabilities.create === true && nodeDragType(source.data) !== undefined,
      onDragEnter: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
      },
      onDrag: ({ source, location }) => {
        const type = nodeDragType(source.data);
        if (type !== undefined) {
          setDrag(dragAt(type, location.current.input));
        }
      },
      onDragLeave: cancelDrag,
      onDrop: () => onPointerUpRef.current(),
    });
  }, [capabilities.create, toScene, snap, setDrag, cancelDrag]);

  const pointer = useMemo(
    () => screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 }),
    [camera, viewport],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      interactedRef.current = true;
      const centre = { x: viewport.width / 2, y: viewport.height / 2 };
      animateTo(zoomAt(registry.get(atoms.camera), centre, registry.get(atoms.camera).zoom * factor));
    },
    [viewport, animateTo, registry, atoms.camera],
  );

  const deleteSelection = useCallback(() => {
    const ids = [...registry.get(atoms.selection)];
    if (ids.length > 0 && capabilities.delete) {
      projection.apply({ kind: 'delete', ids });
      select([]);
    }
  }, [registry, atoms.selection, capabilities.delete, projection, select]);

  /** A default-sized node of `type` centred in the view, its top-left on the grid. */
  const createAtCentre = useCallback(
    (type: NodeType) => {
      const def = nodeRegistry[type];
      if (!def || !capabilities.create) {
        return;
      }
      const size = viewSize(def.defaultSize, camera.zoom);
      const from = { x: snap(pointer.x - size.width / 2), y: snap(pointer.y - size.height / 2) };
      // `dropped`: there is no drawn box, so the type's default size applies, as for a palette drop.
      const node = createdNode({ kind: 'create', type, from, to: from, dropped: true }, createId(type));
      if (node) {
        commitCreated(node);
      }
    },
    [nodeRegistry, capabilities.create, snap, pointer, createdNode, commitCreated],
  );

  const toolbarActions = useMemo<ToolbarActions>(
    () => ({
      path,
      nameOf,
      onPath: (index) => drillOut(path.length - 1 - index),
      fit: () => animateTo(fitBounds(bounds, viewport, inset)),
      zoomIn: () => zoomBy(ZOOM_STEP),
      zoomOut: () => zoomBy(1 / ZOOM_STEP),
      snap: snapEnabled,
      toggleSnap,
      debug,
      toggleDebug,
      canUndo,
      canRedo,
      undo: onUndo,
      redo: onRedo,
      hasSelection: selection.size > 0,
      hasClipboard: clipboard !== undefined,
      cut,
      copy,
      paste: () => paste(),
      delete: deleteSelection,
      create: createAtCentre,
      // A selection of two or more is what the user asked to tidy; one node alone means the board.
      layout: capabilities.layout
        ? () => projection.apply({ kind: 'layout', ids: selection.size > 1 ? [...selection] : undefined })
        : undefined,
    }),
    [
      path,
      nameOf,
      drillOut,
      animateTo,
      bounds,
      viewport,
      inset,
      zoomBy,
      snapEnabled,
      toggleSnap,
      debug,
      toggleDebug,
      canUndo,
      canRedo,
      onUndo,
      onRedo,
      selection,
      clipboard,
      cut,
      copy,
      paste,
      deleteSelection,
      createAtCentre,
      capabilities.layout,
      projection,
    ],
  );

  /** One screen pixel in scene units, for chrome that should not grow with the camera. */
  const frameUnit = 1 / Math.max(camera.zoom, MIN_ZOOM);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={mx(
        'relative dx-fill overflow-hidden bg-base-surface outline-none touch-none select-none',
        tool.kind === 'hand' && 'cursor-grab',
        tool.kind === 'node' && 'cursor-crosshair',
        classNames,
      )}
      style={{ contain: 'strict' }}
      data-testid='scene-view'
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      // A cancelled pointer (a touch the browser took over) abandons the gesture rather than landing it.
      onPointerCancel={cancelDrag}
      onPointerLeave={() => updateHover(undefined)}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
    >
      {/* Only while snapping: the lines are what a gesture lands on, so drawing them when nothing snaps
          states a constraint the canvas is not applying. The minor level goes when its cells get too
          small to read. */}
      {snapEnabled && (
        <GridComponent
          size={grid}
          scale={camera.zoom}
          offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
          showAxes={false}
          ratios={GRID_LEVELS}
          range={GRID_RANGE}
        />
      )}
      <div
        className={mx('absolute pointer-events-none', !measured && 'invisible')}
        style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
      >
        {/* The frame is chrome rather than content, so its stroke and dashes are divided by the zoom
            the parent applies, the way the control frame's are. It is drawn as a stroke rather than a
            CSS border because a border's width is rounded to whole local pixels, which puts a floor of
            one scene unit under it — exactly the thickening that zooming in would cause. */}
        <svg className='absolute overflow-visible pointer-events-none' width={1} height={1}>
          <rect
            data-testid='scene-frame'
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            className='fill-none stroke-orange-border opacity-50'
            strokeWidth={frameUnit}
            strokeDasharray={`${FRAME_DASH * frameUnit} ${FRAME_DASH * frameUnit}`}
          />
        </svg>
        <div className='pointer-events-auto'>
          <SceneLayer
            store={store}
            scene={displayScene}
            registry={nodeRegistry}
            zoom={camera.zoom}
            depth={0}
            liveDepth={liveDepth}
            selected={selection}
            hover={hover}
            opening={opening}
            editing={editing}
            ghost={drag?.kind === 'create' ? PREVIEW_NODE_ID : undefined}
            debug={debug}
            handlers={handlers}
          />
        </div>
        <ControlFrame
          scene={displayScene}
          registry={nodeRegistry}
          selection={selection}
          hover={hover}
          selectedPoint={selectedPoint}
          zoom={camera.zoom}
          drag={drag}
          capabilities={capabilities}
          createFrame={createFrame}
          onHandlePointerDown={onHandlePointerDown}
          onPortPointerDown={onPortPointerDown}
          onEndPointerDown={onEndPointerDown}
          onPointPointerDown={onPointPointerDown}
          onMidpointPointerDown={onMidpointPointerDown}
          onPointContextMenu={onPointContextMenu}
        />
        {overlay}
      </div>
      {/* Wheel events still bubble to the root through the shield, so a zoom keeps zooming. */}
      {navigating && <div className='dx-fullscreen' data-testid='navigation-shield' />}
      <span
        ref={menuAnchorRef}
        className='absolute size-0 pointer-events-none'
        style={{ left: menu?.at.x ?? 0, top: menu?.at.y ?? 0 }}
      />
      <Menu.Root modal={false} open={menu !== undefined} onOpenChange={(open) => !open && closeMenu()}>
        <Menu.VirtualTrigger virtualRef={menuAnchorRef} />
        <Menu.Content side='right' sideOffset={4} collisionPadding={8}>
          <Menu.Viewport>
            {menu?.kind === 'point' && (
              <Menu.Item
                data-testid='remove-point'
                onSelect={() => {
                  const point = registry.get(atoms.point);
                  if (point) {
                    removePoint(point);
                  }
                }}
              >
                Remove control point
              </Menu.Item>
            )}
            {menu?.kind === 'element' && (
              <>
                <Menu.Item data-testid='menu-cut' disabled={!capabilities.delete} onSelect={cut}>
                  Cut
                </Menu.Item>
                <Menu.Item data-testid='menu-copy' onSelect={copy}>
                  Copy
                </Menu.Item>
                <Menu.Item
                  data-testid='menu-delete'
                  disabled={!capabilities.delete}
                  onSelect={() => {
                    projection.apply({ kind: 'delete', ids: [...registry.get(atoms.selection)] });
                    select([]);
                  }}
                >
                  Delete
                </Menu.Item>
              </>
            )}
            {menu?.kind === 'canvas' && (
              <Menu.Item
                data-testid='menu-paste'
                disabled={!clipboard || !capabilities.create}
                onSelect={() => paste(menu.scene)}
              >
                Paste
              </Menu.Item>
            )}
          </Menu.Viewport>
        </Menu.Content>
      </Menu.Root>

      {showToolbar && (
        <>
          <NavigationToolbar classNames='absolute top-2 left-2' actions={toolbarActions}>
            depth {path.length - 1}
          </NavigationToolbar>
          <ActionToolbar
            classNames='absolute top-2 right-2'
            actions={toolbarActions}
            nodes={nodeRegistry}
            capabilities={capabilities}
          />
          <DebugToolbar classNames='absolute bottom-2 left-2'>
            {Math.round(nominalZoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)})
          </DebugToolbar>
        </>
      )}
      {showPalette && (
        <div className='absolute top-14 left-2'>
          <Palette
            tool={tool}
            nodes={nodeRegistry}
            links={linkRegistry}
            capabilities={capabilities}
            onToolChange={setTool}
          />
        </div>
      )}
    </div>
  );
};
