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

import * as Menu from '@dxos/react-ui/Menu';
import type * as Util from '@dxos/react-ui/Util';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';
import { mx } from '@dxos/ui-theme';

import { useRegistry, useSceneProjection, useViewport, useWheel } from '../../hooks/index.ts';
import { type Drag, type SceneViewAtoms, createSceneViewAtoms } from '../../model/atoms.ts';
import { nodeDef } from '../../model/node-def.ts';
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
} from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type Camera,
  DEFAULT_GRID,
  type ElementId,
  type Endpoint,
  type Intent,
  MAJOR_GRID_RATIO,
  type Node,
  type NodeType,
  type Scene,
  type SceneId,
  isPointEndpoint,
} from '../../model/types.ts';
import { MIN_ZOOM, cameraTransform, fitBounds, panBy, screenToScene, zoomAt } from '../../utils/camera.ts';
import { duplicateSelection } from '../../utils/clipboard.ts';
import { nodeDragType } from '../../utils/dnd.ts';
import { boundsFromPoints, hitTest, unionBounds } from '../../utils/hit.ts';
import { topZ } from '../../utils/order.ts';
import { type PartKey, partText, partValues } from '../../utils/parts.ts';
import { createLink, nodeBounds } from '../../utils/shapes.ts';
import { redo, undo } from '../../utils/undo.ts';
import { ControlFrame } from '../ControlFrame/ControlFrame.tsx';
import { GridComponent } from '../Grid/index.ts';
import { LatticeGrid } from '../LatticeGrid/index.ts';
import { Palette } from '../Palette/Palette.tsx';
import { Properties, type PropertiesProps } from '../Properties/Properties.tsx';
import { type ElementHandlers, MAX_LIVE_DEPTH, SceneLayer } from '../SceneLayer/SceneLayer.tsx';
import { ActionToolbar, CameraToolbar, NavigationToolbar, type ToolbarActions } from '../Toolbar/Toolbar.tsx';
import { SceneViewProvider, useSceneViewContext } from './SceneViewContext.ts';
import { PREVIEW_NODE_ID, createId, isLinkDrawn, usePointerMachine } from './usePointerMachine.ts';
import { useSceneCamera } from './useSceneCamera.ts';
import { useSceneClipboard } from './useSceneClipboard.ts';
import { useSceneKeys } from './useSceneKeys.ts';
import { useSceneNavigation } from './useSceneNavigation.ts';
import { GRID_LEVELS, GRID_RANGE, useSceneSnap } from './useSceneSnap.ts';

/** Major cells between the scene's frame and the viewport edge when fitting; `margin` overrides it. */
const DEFAULT_MARGIN = 1;
/** Quiet time after the camera's last move before `onCameraChange` reports it. */
const CAMERA_SETTLE_MS = 300;
/** Zoom factor of one toolbar step. */
const ZOOM_STEP = 1.25;
/** Length of a dash of the scene's frame, in screen px. */
const FRAME_DASH = 4;
/** The link drawn as a preview during a drag; it never reaches the model. */
const PREVIEW_LINK_ID = 'preview-link';

export type SceneViewRootProps = Util.ThemedClassName<{
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
  /** Where the camera starts on the root scene, e.g. as last left; the scene is fitted when unset. */
  initialCamera?: Camera;
  /** Called once the camera settles on the root scene, so a host can persist it. */
  onCameraChange?: (camera: Camera) => void;
  /** Minor grid spacing in scene px; moves snap to it, creation and resizing to the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
  /** Least gap between the scene's frame and each viewport edge when fitting, in whole major cells. */
  margin?: number;
  /**
   * Look, select and navigate only: no gesture or key reaches the model, and no handle or port is drawn,
   * whatever the projection would allow.
   */
  readonly?: boolean;
  children?: ReactNode;
}>;

const SceneViewRoot = ({
  classNames,
  store,
  root,
  nodes: nodeRegistry = defaultNodeRegistry,
  links: linkRegistry = defaultLinkRegistry,
  createProjection,
  projection: projectionProp,
  atoms: atomsProp,
  initialCamera,
  onCameraChange,
  grid = DEFAULT_GRID,
  margin = DEFAULT_MARGIN,
  readonly = false,
  children,
}: SceneViewRootProps) => {
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
  const guides = useAtomValue(atoms.guides);
  const latticeOn = useAtomValue(atoms.lattice);
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
  // A restored camera counts as taken over, so the fit leaves it where it was.
  const interactedRef = useRef(initialCamera !== undefined);

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
    if (initialCamera) {
      setCamera(initialCamera);
    }
    // Only the camera the view opened with is restored; later values are the host echoing ours back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCamera]);
  useLayoutEffect(() => {
    if (!interactedRef.current && measured) {
      setCamera(fitBounds(bounds, viewport, inset));
    }
  }, [measured, viewport, bounds, inset, setCamera]);

  // Reported after a quiet beat, so a wheel gesture or an animation is persisted once, where it ends.
  const atRoot = path.length === 1;
  useEffect(() => {
    if (!onCameraChange || !atRoot || !interactedRef.current) {
      return;
    }
    const timeout = setTimeout(() => onCameraChange(camera), CAMERA_SETTLE_MS);
    return () => clearTimeout(timeout);
  }, [onCameraChange, atRoot, camera]);

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

  const { minor, major, snap, snapMinor } = useSceneSnap(grid, camera.zoom, snapEnabled);
  const toggleSnap = useCallback(() => registry.set(atoms.snap, !registry.get(atoms.snap)), [registry, atoms.snap]);
  const toggleGuides = useCallback(
    () => registry.set(atoms.guides, !registry.get(atoms.guides)),
    [registry, atoms.guides],
  );
  const toggleLattice = useCallback(
    () => registry.set(atoms.lattice, !registry.get(atoms.lattice)),
    [registry, atoms.lattice],
  );
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
    minor,
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

  const onSceneKey = useSceneKeys({
    registry,
    atoms,
    scene,
    nodeRegistry,
    linkRegistry,
    projection,
    capabilities,
    viewport,
    bounds,
    inset,
    grid,
    select,
    toggleSnap,
    toggleGuides,
    toggleLattice,
    toggleDebug,
    onUndo,
    onRedo,
    animateTo,
    drillIn,
    drillOut,
    goHistory,
    major,
    copy,
    cut,
    paste,
    cancelDrag,
    removePoint,
    setTool,
  });

  // Shortcuts belong to the canvas itself: keys typed into a control the view hosts (the properties
  // panel, a toolbar) bubble here too, and must not toggle debug or delete the selection.
  const onKeyDown = useCallback<typeof onSceneKey>(
    (event) => {
      if (event.target === event.currentTarget) {
        onSceneKey(event);
      }
    },
    [onSceneKey],
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
  // a link being drawn or re-attached over a drop target looks exactly as it will once dropped. Geometry
  // previews pass through the projection's `constrain`, so a drag shows where the drop will land, and
  // `blocked` says when the drop would be refused (drawn as is, outlined in red).
  const { displayScene, blocked } = useMemo<{ displayScene: Scene; blocked: boolean }>(() => {
    const preview = (intent: Intent) => {
      const constrained = projection.constrain ? projection.constrain(intent) : intent;
      return { displayScene: reduceIntent(scene, constrained ?? intent), blocked: constrained === undefined };
    };
    if (drag?.kind === 'move') {
      // A copy previews beside the originals, which stay; the drop mints the copies' real ids.
      let next = 0;
      const copy = drag.copy
        ? duplicateSelection(scene, drag.ids, drag.delta, (prefix) => `${PREVIEW_NODE_ID}-${prefix}-${next++}`)
        : undefined;
      return preview(copy ? copy.intent : { kind: 'move', ids: drag.ids, delta: drag.delta });
    }
    if (drag?.kind === 'resize') {
      return preview({ kind: 'resize', id: drag.id, bounds: drag.bounds });
    }
    // A node being created previews as the type's own view inside its frame, whether drawn on the canvas
    // or dragged in from the palette (whose drag carries no image of its own).
    if (drag?.kind === 'create') {
      return createPreview ? preview({ kind: 'create', node: createPreview }) : { displayScene: scene, blocked: false };
    }
    if (drag?.kind === 'point') {
      return {
        displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { points: drag.points } }),
        blocked: false,
      };
    }
    // A link previews only once it has gone a grid cell, so a click with a link tool draws nothing.
    if (drag?.kind === 'link' && isLinkDrawn(drag, minor) && (drag.target || isPointEndpoint(drag.source))) {
      // A port drag previews once it reaches a target; a free-ended link previews as it will land.
      const link = createLink({
        type: drag.type,
        id: PREVIEW_LINK_ID,
        z: topZ(Object.values(scene.links)),
        source: drag.source,
        target: drag.target ?? { point: drag.to },
        midpoint: { x: (drag.from.x + drag.to.x) / 2, y: (drag.from.y + drag.to.y) / 2 },
      });
      return { displayScene: reduceIntent(scene, { kind: 'link', link }), blocked: false };
    }
    if (drag?.kind === 'end') {
      // The link is drawn as it will land: re-attached over a target, free-ended over empty canvas.
      const end: Endpoint = drag.target ?? { point: drag.to };
      return {
        displayScene: reduceIntent(scene, { kind: 'update', id: drag.id, values: { [drag.end]: end } }),
        blocked: false,
      };
    }
    return { displayScene: scene, blocked: false };
  }, [scene, drag, createPreview, projection, minor]);

  /** The bounds a create gesture would land, drawn as a frame whether or not the node itself previews. */
  const createFrame = useMemo(() => {
    const preview = createPreview && displayScene.nodes[createPreview.id];
    return preview ? nodeBounds(preview) : undefined;
  }, [createPreview, displayScene]);

  const onPartCommit = useCallback(
    (node: Node, part: PartKey, text: string) => {
      registry.set(atoms.editing, undefined);
      const values = partValues(nodeRegistry, node, part, text);
      if (values && capabilities.update && text !== partText(nodeRegistry, node, part)) {
        projection.apply({ kind: 'update', id: node.id, values });
      }
    },
    [registry, atoms.editing, capabilities.update, projection, nodeRegistry],
  );
  const onPartCancel = useCallback(() => registry.set(atoms.editing, undefined), [registry, atoms.editing]);

  const handlers = useMemo<ElementHandlers>(
    () => ({
      onNodePointerDown,
      onLinkPointerDown,
      onLinkDoubleClick,
      onLinkContextMenu,
      onPartCommit,
      onPartCancel,
      onNodeOpen: drillIn,
    }),
    [onNodePointerDown, onLinkPointerDown, onLinkDoubleClick, onLinkContextMenu, onPartCommit, onPartCancel, drillIn],
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
      // A floating panel over the node took the clicks, so the node beneath is not the one meant.
      if (!(target instanceof Element) || !target.closest('[data-node-id]')) {
        return;
      }
      const partElement = target.closest('[data-part]');
      const part =
        partElement?.closest('[data-node-id]')?.getAttribute('data-node-id') === node.id
          ? (partElement?.getAttribute('data-part') ?? undefined)
          : undefined;
      if (part && capabilities.update && partText(nodeRegistry, node, part) !== undefined) {
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
    // The pointer is the shape's centre; its top-left is what snaps, so the edges land on the grid.
    const dragAt = (type: NodeType, input: { clientX: number; clientY: number }): Drag => {
      const point = toScene(input);
      const size = nodeRegistry[type]?.defaultSize ?? { width: 0, height: 0 };
      const from = { x: snap(point.x - size.width / 2), y: snap(point.y - size.height / 2) };
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
  }, [capabilities.create, nodeRegistry, toScene, snap, setDrag, cancelDrag]);

  const pointer = useMemo(
    () => screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 }),
    [camera, viewport],
  );

  // Shapes may land on free cells beyond the scene's frame, so the cells cover whatever is in view as well.
  const latticeBounds = useMemo(() => {
    const visible = boundsFromPoints(
      screenToScene(camera, { x: 0, y: 0 }),
      screenToScene(camera, { x: viewport.width, y: viewport.height }),
    );
    return unionBounds([bounds, visible]) ?? bounds;
  }, [camera, viewport, bounds]);

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
      const size = def.defaultSize;
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
      guides,
      toggleGuides,
      // Only a lattice scene has a lattice to snap to.
      ...(projection.lattice ? { lattice: latticeOn, toggleLattice } : {}),
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
      guides,
      toggleGuides,
      latticeOn,
      toggleLattice,
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
    <SceneViewProvider
      registry={registry}
      atoms={atoms}
      store={store}
      projection={projection}
      capabilities={capabilities}
      nodeRegistry={nodeRegistry}
      linkRegistry={linkRegistry}
      scene={scene}
      displayScene={displayScene}
      blocked={blocked}
      bounds={bounds}
      latticeBounds={latticeBounds}
      path={path}
      camera={camera}
      nominalZoom={nominalZoom}
      pointer={pointer}
      measured={measured}
      frameUnit={frameUnit}
      grid={grid}
      snapEnabled={snapEnabled}
      guides={guides}
      latticeOn={latticeOn}
      selection={selection}
      hover={hover}
      selectedPoint={selectedPoint}
      editing={editing}
      clipboard={clipboard}
      drag={drag}
      tool={tool}
      debug={debug}
      createFrame={createFrame}
      handlers={handlers}
      select={select}
      toolbarActions={toolbarActions}
      navigating={navigating}
      opening={opening}
      drillIn={drillIn}
      copy={copy}
      cut={cut}
      paste={paste}
      onBackgroundPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={onContextMenu}
      cancelDrag={cancelDrag}
      updateHover={updateHover}
      onHandlePointerDown={onHandlePointerDown}
      onPortPointerDown={onPortPointerDown}
      onEndPointerDown={onEndPointerDown}
      onPointPointerDown={onPointPointerDown}
      onMidpointPointerDown={onMidpointPointerDown}
      onPointContextMenu={onPointContextMenu}
      setTool={setTool}
      removePoint={removePoint}
      menu={menu}
      closeMenu={closeMenu}
      menuAnchorRef={menuAnchorRef}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      rootRef={rootRef}
    >
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
        {children}
      </div>
    </SceneViewProvider>
  );
};

SceneViewRoot.displayName = 'SceneView.Root';

//
// Canvas
//

export type SceneViewCanvasProps = {
  /** Nested levels below the root that may mount live; deeper portals stay previews (decision 10). */
  liveDepth?: number;
  /** Extra layers drawn in scene coordinates under the camera, above the scene (e.g. a host's animations). */
  overlay?: ReactNode;
};

/** The scene itself under the camera: the grid, the layer, the control frame and the menu a gesture opens. */
const SceneViewCanvas = ({ liveDepth = MAX_LIVE_DEPTH, overlay }: SceneViewCanvasProps) => {
  const {
    registry,
    atoms,
    store,
    capabilities,
    projection,
    nodeRegistry,
    displayScene,
    blocked,
    bounds,
    latticeBounds,
    camera,
    measured,
    frameUnit,
    grid,
    snapEnabled,
    guides,
    latticeOn,
    selection,
    hover,
    selectedPoint,
    editing,
    clipboard,
    drag,
    debug,
    createFrame,
    handlers,
    select,
    navigating,
    opening,
    copy,
    cut,
    paste,
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
  } = useSceneViewContext('SceneView.Canvas');

  return (
    <>
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
        {/* A lattice scene shows its cells: the places a shape may land, separated by the gutters. */}
        {guides && latticeOn && projection.lattice && (
          <LatticeGrid spec={projection.lattice} bounds={latticeBounds} unit={frameUnit} />
        )}
        {guides && (
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
            hover={hover}
            opening={opening}
            editing={editing}
            ghost={drag?.kind === 'create' ? PREVIEW_NODE_ID : undefined}
            debug={debug}
            handlers={handlers}
            // Routes follow the gutters in lattice mode, whether or not snap is on.
            lattice={latticeOn ? projection.lattice : undefined}
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
          blocked={blocked}
          lattice={latticeOn ? projection.lattice : undefined}
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
                onSelect={() => {
                  projection.apply({ kind: 'delete', ids: [...registry.get(atoms.selection)] });
                  select([]);
                }}
                item={{ value: 'Delete', label: 'Delete' }}
              />
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

SceneViewCanvas.displayName = 'SceneView.Canvas';

//
// Toolbars
//

export type SceneViewBarProps = Util.ThemedClassName<{}>;

/**
 * The frame a bar floats in: its content's width, but half the view at most (the bar scrolls beyond that).
 * The toolbar's own scroll frame is zero-height in flow, so `classNames` positions this frame, not the bar.
 */
const barFrame = 'absolute w-max max-w-[50%]';

/** Where the view is in the scene tree. */
const SceneViewNavigation = ({ classNames = 'top-2 left-2' }: SceneViewBarProps) => {
  const { toolbarActions, path } = useSceneViewContext('SceneView.Navigation');
  return (
    <div className={mx(barFrame, classNames)}>
      <NavigationToolbar actions={toolbarActions}>depth {path.length - 1}</NavigationToolbar>
    </div>
  );
};

SceneViewNavigation.displayName = 'SceneView.Navigation';

/** Everything that changes the view or the scene. */
const SceneViewActions = ({ classNames = 'bottom-2 left-1/2 -translate-x-1/2' }: SceneViewBarProps) => {
  const { toolbarActions, nodeRegistry, capabilities } = useSceneViewContext('SceneView.Actions');
  return (
    <div className={mx(barFrame, classNames)}>
      <ActionToolbar actions={toolbarActions} nodes={nodeRegistry} capabilities={capabilities} />
    </div>
  );
};

SceneViewActions.displayName = 'SceneView.Actions';

/** The camera's controls and numbers; nothing here changes the scene. */
const SceneViewDebug = ({ classNames = 'bottom-2 left-2' }: SceneViewBarProps) => {
  const { toolbarActions, nominalZoom, pointer } = useSceneViewContext('SceneView.Debug');
  return (
    <div className={mx(barFrame, classNames)}>
      <CameraToolbar actions={toolbarActions}>
        {Math.round(nominalZoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)})
      </CameraToolbar>
    </div>
  );
};

SceneViewDebug.displayName = 'SceneView.Debug';

//
// Palette
//

/** The tool rail: what the next gesture will draw. */
const SceneViewPalette = ({ classNames = 'absolute top-14 left-2' }: SceneViewBarProps) => {
  const { tool, nodeRegistry, linkRegistry, capabilities, setTool } = useSceneViewContext('SceneView.Palette');
  return (
    <div className={mx(classNames)}>
      <Palette
        tool={tool}
        nodes={nodeRegistry}
        links={linkRegistry}
        capabilities={capabilities}
        onToolChange={setTool}
      />
    </div>
  );
};

SceneViewPalette.displayName = 'SceneView.Palette';

//
// Properties
//

export type SceneViewPropertiesProps = Util.ThemedClassName<
  Pick<PropertiesProps, 'fields' | 'db' | 'getOptions' | 'overrides'>
>;

/** The selected element's properties as a floating panel; absent while nothing is selected. */
const SceneViewProperties = ({
  classNames = 'absolute top-2 right-2 w-80 max-h-[calc(100%-1rem)]',
  fields,
  db,
  getOptions,
  overrides,
}: SceneViewPropertiesProps) => {
  const { projection, atoms, nodeRegistry, capabilities, selection } = useSceneViewContext('SceneView.Properties');
  if (selection.size === 0) {
    return null;
  }

  return (
    <Properties
      classNames={mx('rounded-sm bg-modal-surface border border-separator', classNames)}
      projection={projection}
      atoms={atoms}
      nodes={nodeRegistry}
      fields={fields}
      db={db}
      getOptions={getOptions}
      overrides={overrides}
      readonly={!capabilities.update}
    />
  );
};

SceneViewProperties.displayName = 'SceneView.Properties';

export const SceneView = {
  Root: SceneViewRoot,
  Canvas: SceneViewCanvas,
  Navigation: SceneViewNavigation,
  Actions: SceneViewActions,
  Debug: SceneViewDebug,
  Palette: SceneViewPalette,
  Properties: SceneViewProperties,
};
