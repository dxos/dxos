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
import React, { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Menu, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useRegistry, useSceneProjection, useViewport, useWheel } from '../../hooks/index.ts';
import {
  type ControlPointRef,
  type Drag,
  type Handle,
  type SceneViewAtoms,
  createSceneViewAtoms,
} from '../../model/atoms.ts';
import { isToolKey, keyAction } from '../../model/keys.ts';
import {
  type FreehandProjectionOptions,
  type Projection,
  readonlyCapabilities,
  reduceIntent,
} from '../../model/projection.ts';
import {
  type CreateProps,
  type LinkRegistry,
  type NodeRegistry,
  defaultLinkRegistry,
  defaultNodeRegistry,
  nodeDef,
} from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type Bounds,
  type Camera,
  DEFAULT_GRID,
  type ElementId,
  type Endpoint,
  type Link,
  MAJOR_GRID,
  MAJOR_GRID_RATIO,
  type Node,
  type NodeId,
  type NodeType,
  type Point,
  type Port,
  type Scene,
  type SceneId,
  type Size,
  type SplineLink,
  type Tool,
  endpointNode,
  isPointEndpoint,
  isPortalNode,
} from '../../model/types.ts';
import {
  animateCamera,
  boundsCenter,
  cameraTransform,
  coverage,
  enterPortal,
  exitPortal,
  fitBounds,
  panBy,
  portalFrame,
  portalScale,
  screenToScene,
  zoomAt,
} from '../../utils/camera.ts';
import { clipboardBounds, copySelection, pasteFragment } from '../../utils/clipboard.ts';
import { nodeDragType } from '../../utils/dnd.ts';
import { boundsFromPoints, hitTest, nodesIntersecting, sceneBounds, unionBounds } from '../../utils/hit.ts';
import { between, topZ } from '../../utils/order.ts';
import { type PartKey, partKey, partText, partValues } from '../../utils/parts.ts';
import { nodePorts, portAccepts, portPoint } from '../../utils/ports.ts';
import { resizeBounds } from '../../utils/resize.ts';
import { insertIndex, linkGeometry, sideToward } from '../../utils/route.ts';
import { DEFAULT_SIZES, createLink, createNode, nodeBounds } from '../../utils/shapes.ts';
import { redo, undo } from '../../utils/undo.ts';
import { ControlFrame, type LinkEnd, handlePoint } from '../ControlFrame/ControlFrame.tsx';
import { GridComponent } from '../Grid/index.ts';
import { Palette, toolForKey } from '../Palette/Palette.tsx';
import { type ElementHandlers, MAX_LIVE_DEPTH, SceneLayer } from '../SceneLayer/SceneLayer.tsx';
import { ActionToolbar, NavigationToolbar, type ToolbarActions } from '../Toolbar/Toolbar.tsx';

const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;
const AUTO_DRILL_MS = 150;
/** Quiet time after the last wheel step before the canvas takes pointer events again. */
const NAVIGATION_SETTLE_MS = 150;
/** Major cells between the scene's frame and the viewport edge when fitting; `margin` overrides it. */
const DEFAULT_MARGIN = 1;
/** Zoom factor of one toolbar step. */
const ZOOM_STEP = 1.25;
/**
 * Grid levels a fourfold apart, from a quarter of the minor grid to far past the major one, so the levels
 * on screen depend on the zoom alone: a child scene seen at a quarter scale draws the same lines as its
 * parent, and a far zoom-out still shows a grid.
 */
const GRID_LEVELS = [1 / MAJOR_GRID_RATIO, 1, MAJOR_GRID_RATIO, MAJOR_GRID_RATIO ** 2, MAJOR_GRID_RATIO ** 3] as const;
/** Cells under 6px are noise; past 2048px a level is a line or two across the view. */
const GRID_RANGE = [6, 2048] as const;
/**
 * A type's default size in scene units such that it covers the same screen area whatever the camera is
 * doing. A nested scene is entered at a fraction of the parent's zoom, so a size fixed in scene units
 * arrives a quarter or less of its apparent size there; scaling by the zoom is what keeps a new node the
 * same on screen at every level, and it is stable — unlike the portal's own factor, which grows with the
 * child's bounds and so would feed back into the size of the next node drawn.
 */
const viewSize = ({ width, height }: Size, zoom: number): Size => ({
  width: Math.max(MAJOR_GRID, Math.round(width / zoom / MAJOR_GRID) * MAJOR_GRID),
  height: Math.max(MAJOR_GRID, Math.round(height / zoom / MAJOR_GRID) * MAJOR_GRID),
});
const PORT_SNAP_PX = 16;
/** Ids of the link and node drawn as previews during a drag; neither reaches the model. */
const PREVIEW_LINK_ID = 'preview-link';
const PREVIEW_NODE_ID = 'preview-node';

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Whether a link between two endpoints has a direction: either pinned port declares `in` or `out`. */
const isDirected = (scene: Scene, registry: NodeRegistry, source: Endpoint, target: Endpoint): boolean =>
  [source, target].some((end) => {
    if (isPointEndpoint(end)) {
      return false;
    }
    const node = scene.nodes[end.node];
    const port = node && nodePorts(registry, node).find((candidate) => candidate.id === end.port);
    return port !== undefined && port.accepts !== undefined && port.accepts !== 'any';
  });

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

  const nameOf = useCallback((id: SceneId) => scenes[id]?.name ?? id, [scenes]);
  /** The portal in `parent` that shows `childId`, if any. */
  const portalTo = useCallback(
    (parentId: SceneId | undefined, childId: SceneId): Node | undefined => {
      const parent = parentId ? scenes[parentId] : undefined;
      return parent
        ? Object.values(parent.nodes).find((node) => isPortalNode(node) && node.scene === childId)
        : undefined;
    },
    [scenes],
  );
  /** The frame of the scene at the head of `path`: the parent portal's frame, or the derived bounds at the root. */
  const frameOf = useCallback(
    (scenePath: SceneId[], current: Scene): Bounds => {
      const derived = sceneBounds(current);
      const portal = portalTo(scenePath[scenePath.length - 2], current.id);
      return portal ? portalFrame(portal, derived) : derived;
    },
    [portalTo],
  );
  // A scene entered through a portal keeps the frame it arrived with. Deriving it from the content on
  // every edit moves the child under the user as they work, and maps a drill-out differently from the
  // drill-in that opened it; the root has no portal to sit in, so its bounds stay derived.
  const frameRef = useRef<{ key: string; frame: Bounds } | undefined>(undefined);
  const bounds = useMemo(() => {
    if (path.length < 2) {
      frameRef.current = undefined;
      return frameOf(path, scene);
    }
    const key = path.join(' ');
    if (frameRef.current?.key !== key) {
      frameRef.current = { key, frame: frameOf(path, scene) };
    }
    return frameRef.current.frame;
  }, [frameOf, path, scene]);
  /**
   * The camera's zoom against the level's own 1:1 rather than the root's. A portal frame is the portal's
   * box times a power of the grid ratio, so entering one divides the camera by that factor; reported raw,
   * the number would drop fourfold on a drill-in that changed nothing the user can see. Display only —
   * nothing derives geometry from it, so the frame growing with its content cannot feed back.
   */
  const nominalZoom = useMemo(() => {
    const scale = path.slice(1).reduce((accumulated, sceneId, index) => {
      const parent = scenes[path[index]];
      const child = scenes[sceneId];
      const portal = parent && child ? portalTo(parent.id, sceneId) : undefined;
      return portal && child ? accumulated * portalScale(portal, portalFrame(portal, sceneBounds(child))) : accumulated;
    }, 1);
    return camera.zoom / scale;
  }, [path, scenes, portalTo, camera.zoom]);

  // Every gesture, key and control is gated on these, so a read-only view is the projection with nothing allowed.
  const capabilities = readonly ? readonlyCapabilities : projection.capabilities;

  //
  // Camera.
  //

  const setCamera = useCallback(
    (next: Camera | ((camera: Camera) => Camera)) => {
      registry.set(atoms.camera, typeof next === 'function' ? next(registry.get(atoms.camera)) : next);
    },
    [registry, atoms.camera],
  );

  // Clears the ref as well: a cancelled frame never runs the completion callback that would.
  const cancelRef = useRef<() => void>(undefined);
  // The portal a drill-in is zooming into; it renders as the plain child scene until the root swaps.
  const [opening, setOpening] = useState<ElementId>();
  // While the camera moves on its own (wheel zoom or pan, an animation) the canvas ignores the pointer:
  // nothing under it is where it will be, so hover and presses would land on passing content.
  const [navigating, setNavigating] = useState(false);
  const navigatingRef = useRef(false);
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setNavigation = useCallback(
    (active: boolean) => {
      clearTimeout(settleRef.current);
      settleRef.current = undefined;
      if (navigatingRef.current !== active) {
        navigatingRef.current = active;
        setNavigating(active);
        if (active) {
          registry.set(atoms.hover, undefined);
        }
      }
    },
    [registry, atoms.hover],
  );
  /** Navigation that ends on its own: stays active until no wheel step arrives for a beat. */
  const touchNavigation = useCallback(() => {
    setNavigation(true);
    settleRef.current = setTimeout(() => setNavigation(false), NAVIGATION_SETTLE_MS);
  }, [setNavigation]);
  useEffect(() => () => clearTimeout(settleRef.current), []);

  const cancelAnimation = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = undefined;
      setNavigation(false);
    }
    setOpening(undefined);
  }, [setNavigation]);

  const animateTo = useCallback(
    (target: Camera, done?: () => void) => {
      cancelAnimation();
      setNavigation(true);
      cancelRef.current = animateCamera(registry.get(atoms.camera), target, viewport, setCamera, () => {
        cancelRef.current = undefined;
        setNavigation(false);
        done?.();
      });
    },
    [registry, atoms.camera, viewport, setCamera, cancelAnimation, setNavigation],
  );

  // Keep the scene fitted while the viewport settles, until the user takes the camera over. A layout
  // effect, so the fit lands before the first paint instead of one frame after it.
  const interactedRef = useRef(false);
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

  const pushHistory = useCallback(
    (entry: { path: SceneId[]; camera: Camera }) => {
      const history = registry.get(atoms.history);
      const entries = [...history.entries.slice(0, history.index + 1), entry];
      registry.set(atoms.history, { entries, index: entries.length - 1 });
    },
    [registry, atoms.history],
  );

  const select = useCallback(
    (ids: Iterable<ElementId>) => {
      registry.set(atoms.selection, new Set(ids));
      registry.set(atoms.point, undefined);
    },
    [registry, atoms.selection, atoms.point],
  );

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

  const drillIn = useCallback(
    (portal: Node, animate = true) => {
      const child = isPortalNode(portal) ? scenes[portal.scene] : undefined;
      if (!child) {
        return;
      }
      interactedRef.current = true;
      // The zoom is into the child, so the portal's selection outline and ports go before it starts.
      select([]);
      registry.set(atoms.hover, undefined);
      registry.set(atoms.editing, undefined);
      const childBounds = portalFrame(portal, sceneBounds(child));
      const swap = (camera: Camera) => {
        const next = enterPortal(camera, portal, childBounds);
        registry.set(atoms.path, [...registry.get(atoms.path), child.id]);
        setCamera(next);
        setOpening(undefined);
        pushHistory({ path: registry.get(atoms.path), camera: next });
      };
      if (animate) {
        // Zoom onto the portal, but only as far as leaves the child at 1:1 after the swap, so its text lands at
        // its natural size rather than magnified to fill the view.
        const target = fitBounds(nodeBounds(portal), viewport, 0, 1 / portalScale(portal, childBounds));
        animateTo(target, () => swap(target));
        setOpening(portal.id);
      } else {
        swap(registry.get(atoms.camera));
      }
    },
    [
      scenes,
      registry,
      atoms.path,
      atoms.camera,
      atoms.hover,
      atoms.editing,
      viewport,
      animateTo,
      setCamera,
      select,
      pushHistory,
    ],
  );

  const drillOut = useCallback(
    (levels = 1, animate = true) => {
      const current = registry.get(atoms.path);
      if (current.length < 2 || levels < 1) {
        return;
      }
      let camera = registry.get(atoms.camera);
      let next = current;
      for (let level = 0; level < levels && next.length > 1; level++) {
        const child = scenes[next[next.length - 1]];
        const parent = scenes[next[next.length - 2]];
        const portal = parent
          ? Object.values(parent.nodes).find((node) => isPortalNode(node) && node.scene === child?.id)
          : undefined;
        if (!child || !portal) {
          break;
        }
        // The level being left exits through the frame it was entered with, so the camera lands where
        // the drill-in took it from however the child was edited in between.
        camera = exitPortal(camera, portal, level === 0 ? bounds : portalFrame(portal, sceneBounds(child)));
        next = next.slice(0, -1);
      }
      registry.set(atoms.path, next);
      select([]);
      setCamera(camera);
      const parent = scenes[next[next.length - 1]];
      if (animate && parent) {
        animateTo(fitBounds(frameOf(next, parent), viewport, inset));
      }
      pushHistory({ path: next, camera });
    },
    [
      registry,
      atoms.path,
      atoms.camera,
      scenes,
      viewport,
      inset,
      animateTo,
      setCamera,
      select,
      pushHistory,
      frameOf,
      bounds,
    ],
  );

  const goHistory = useCallback(
    (offset: number) => {
      const history = registry.get(atoms.history);
      const index = history.index + offset;
      const entry = history.entries[index];
      if (!entry) {
        return;
      }
      registry.set(atoms.history, { ...history, index });
      registry.set(atoms.path, entry.path);
      select([]);
      animateTo(entry.camera);
    },
    [registry, atoms.history, atoms.path, select, animateTo],
  );

  // Auto drill: a portal filling the viewport becomes the root; a root shrunk well below its size on arrival
  // yields to its parent. Arrival is the history entry for this path, so a child capped at 1:1 (or a frame
  // that shrinks under a stationary camera) is measured against itself rather than an absolute coverage.
  useEffect(() => {
    if (cancelRef.current || drag || viewport.width === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const portal = Object.values(scene.nodes).find(
        (node) => isPortalNode(node) && coverage(camera, nodeBounds(node), viewport) >= AUTO_ENTER,
      );
      if (portal) {
        drillIn(portal, false);
      } else if (path.length > 1) {
        const history = registry.get(atoms.history);
        const arrival = history.entries[history.index];
        const arrived =
          arrival && arrival.path.length === path.length && arrival.path.every((id, index) => id === path[index]);
        const reference = arrived ? coverage(arrival.camera, bounds, viewport) : 1;
        if (coverage(camera, bounds, viewport) < AUTO_EXIT * reference) {
          drillOut(1, false);
        }
      }
    }, AUTO_DRILL_MS);
    return () => clearTimeout(timer);
  }, [camera, scene, bounds, path, viewport, drag, drillIn, drillOut, registry, atoms.history]);

  //
  // Pointer state machine.
  //

  /**
   * The finest grid level actually drawn, which is what gestures snap to. A level fixed in scene units
   * parts company with the lines as soon as the zoom moves: `Grid` keeps a level only while its cells are
   * legible on screen, so far enough in the drawn lines are finer than the snap and far enough out (a
   * nested scene, entered at a fraction of the parent's zoom) they are coarser and the snap stops landing
   * on anything visible. Reading the level back from the same rule keeps the two the same by construction.
   */
  const minor = useMemo(() => {
    const levels = GRID_LEVELS.map((ratio) => ratio * grid);
    return levels.find((size) => size * camera.zoom >= GRID_RANGE[0]) ?? levels[levels.length - 1];
  }, [grid, camera.zoom]);
  const major = minor * MAJOR_GRID_RATIO;
  const snap = useCallback(
    (value: number) => (snapEnabled ? Math.round(value / major) * major : value),
    [snapEnabled, major],
  );
  // Moving is finer than creating or resizing: a placed node keeps its major-grid size and edges land on
  // minor lines, so ports (drawn at the nearest major line) stay aligned while placement is not coarse.
  const snapMinor = useCallback(
    (value: number) => (snapEnabled ? Math.round(value / minor) * minor : value),
    [snapEnabled, minor],
  );
  const toggleSnap = useCallback(() => registry.set(atoms.snap, !registry.get(atoms.snap)), [registry, atoms.snap]);
  const toggleDebug = useCallback(() => registry.set(atoms.debug, !registry.get(atoms.debug)), [registry, atoms.debug]);
  const toScene = useCallback(
    (event: { clientX: number; clientY: number }): Point => {
      const rect = rootRef.current?.getBoundingClientRect();
      const camera = registry.get(atoms.camera);
      return screenToScene(camera, { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) });
    },
    [registry, atoms.camera],
  );

  const setDrag = useCallback((next: Drag | undefined) => registry.set(atoms.drag, next), [registry, atoms.drag]);
  const setTool = useCallback(
    (next: Tool) => {
      registry.set(atoms.tool, next);
      if (next.kind === 'link') {
        registry.set(atoms.linkType, next.type);
      }
      // A creation tool is about what comes next, so the outgoing selection's outline and handles would
      // only sit over the drawing; the node the gesture makes becomes the selection.
      if (next.kind === 'node' || next.kind === 'link') {
        registry.set(atoms.selection, new Set<ElementId>());
        registry.set(atoms.point, undefined);
      }
    },
    [registry, atoms.tool, atoms.linkType, atoms.selection, atoms.point],
  );

  const startDrag = useCallback(
    (next: Drag, event: React.PointerEvent) => {
      interactedRef.current = true;
      cancelAnimation();
      setDrag(next);
      rootRef.current?.setPointerCapture(event.pointerId);
    },
    [cancelAnimation, setDrag],
  );

  const onBackgroundPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      const currentTool = registry.get(atoms.tool);
      const point = toScene(event);
      if (event.button === 1 || currentTool.kind === 'hand') {
        startDrag({ kind: 'pan', last: { x: event.clientX, y: event.clientY } }, event);
      } else if (event.button !== 0) {
        return;
      } else if (currentTool.kind === 'node') {
        if (capabilities.create) {
          const from = { x: snap(point.x), y: snap(point.y) };
          startDrag({ kind: 'create', type: currentTool.type, from, to: from }, event);
        }
      } else if (currentTool.kind === 'link') {
        // A link tool on empty canvas draws a free-ended link (decision 3); dropping on a node attaches that end.
        if (capabilities.link) {
          startDrag(
            { kind: 'link', type: currentTool.type, source: { point }, from: point, fromSide: 'e', to: point },
            event,
          );
        }
      } else {
        const mode = event.altKey ? 'subtract' : event.shiftKey ? 'add' : 'replace';
        if (mode === 'replace') {
          select([]);
        }
        startDrag({ kind: 'marquee', from: point, to: point, mode }, event);
      }
    },
    [registry, atoms.tool, toScene, startDrag, select, capabilities.create, capabilities.link, snap],
  );

  /** Click selection shared by nodes and links: shift toggles, a plain click on an unselected element replaces. */
  const clickSelect = useCallback(
    (id: ElementId, event: React.PointerEvent): Set<ElementId> => {
      const current = registry.get(atoms.selection);
      const next = new Set(event.shiftKey ? current : current.has(id) ? current : []);
      if (event.shiftKey && current.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      select(next);
      return next;
    },
    [registry, atoms.selection, select],
  );

  const onNodePointerDown = useCallback(
    (node: Node, event: React.PointerEvent) => {
      const currentTool = registry.get(atoms.tool);
      if ((currentTool.kind !== 'select' && currentTool.kind !== 'link') || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      // With a link tool the body is a source like a port is, so a link can be drawn between two shapes
      // without aiming at their dots; the endpoint carries no port and routing picks the side.
      if (currentTool.kind === 'link' && capabilities.link) {
        const from = toScene(event);
        // The band leaves the side of the node the press is nearest; routing picks the real side on drop.
        const fromSide = sideToward(boundsCenter(nodeBounds(node)), from);
        startDrag({ kind: 'link', type: currentTool.type, source: { node: node.id }, from, fromSide, to: from }, event);
        return;
      }
      const next = clickSelect(node.id, event);
      if (capabilities.move && !node.locked) {
        const { x, y } = nodeBounds(node);
        const ids = [...next].filter((id) => scene.nodes[id] !== undefined);
        startDrag({ kind: 'move', ids, origin: toScene(event), anchor: { x, y }, delta: { x: 0, y: 0 } }, event);
      }
    },
    [registry, atoms.tool, clickSelect, capabilities.move, capabilities.link, scene.nodes, toScene, startDrag],
  );

  const onLinkPointerDown = useCallback(
    (link: Link, event: React.PointerEvent) => {
      const currentTool = registry.get(atoms.tool);
      if (currentTool.kind === 'hand' || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      clickSelect(link.id, event);
    },
    [registry, atoms.tool, clickSelect],
  );

  const onHandlePointerDown = useCallback(
    (node: Node, handle: Handle, event: React.PointerEvent) => {
      if (event.button !== 0 || !capabilities.resize) {
        return;
      }
      event.stopPropagation();
      const start = nodeBounds(node);
      startDrag({ kind: 'resize', id: node.id, handle, start, bounds: start }, event);
    },
    [capabilities.resize, startDrag],
  );

  const onPortPointerDown = useCallback(
    (node: Node, port: Port, event: React.PointerEvent) => {
      // A link leaves a port that accepts `out`; an input-only port is a drop target, not a source.
      if (event.button !== 0 || !capabilities.link || !portAccepts(port, 'out')) {
        return;
      }
      event.stopPropagation();
      const from = portPoint(nodeBounds(node), port);
      const currentTool = registry.get(atoms.tool);
      const type = currentTool.kind === 'link' ? currentTool.type : registry.get(atoms.linkType);
      startDrag(
        { kind: 'link', type, source: { node: node.id, port: port.id }, from, fromSide: port.side, to: from },
        event,
      );
    },
    [capabilities.link, registry, atoms.tool, atoms.linkType, startDrag],
  );

  const removePoint = useCallback(
    ({ link: id, index }: ControlPointRef) => {
      const link = scene.links[id];
      if (link?.type === 'spline' && capabilities.update) {
        projection.apply({ kind: 'update', id, values: { points: link.points.filter((_, i) => i !== index) } });
      }
      registry.set(atoms.point, undefined);
    },
    [scene.links, capabilities.update, projection, registry, atoms.point],
  );

  /** A spline's control point: press selects it, drag moves it, alt-click removes it. */
  const onPointPointerDown = useCallback(
    (link: SplineLink, index: number, event: React.PointerEvent) => {
      if (event.button !== 0 || !capabilities.update) {
        return;
      }
      event.stopPropagation();
      if (event.altKey) {
        removePoint({ link: link.id, index });
        return;
      }
      registry.set(atoms.point, { link: link.id, index });
      startDrag({ kind: 'point', id: link.id, index, points: [...link.points] }, event);
    },
    [capabilities.update, removePoint, registry, atoms.point, startDrag],
  );

  /** The midpoint of a span: pressing it adds a control point there and moves it in the same gesture. */
  const onMidpointPointerDown = useCallback(
    (link: SplineLink, index: number, point: Point, event: React.PointerEvent) => {
      if (event.button !== 0 || !capabilities.update) {
        return;
      }
      event.stopPropagation();
      registry.set(atoms.point, { link: link.id, index });
      const points = [...link.points.slice(0, index), point, ...link.points.slice(index)];
      startDrag({ kind: 'point', id: link.id, index, points }, event);
    },
    [capabilities.update, registry, atoms.point, startDrag],
  );

  // The right-click menu opens at the pointer, anchored to an empty element parked under the cursor
  // (the menu positions itself at a real element); what it offers depends on what was pressed.
  const menuAnchorRef = useRef<HTMLSpanElement>(null);
  const [menu, setMenu] = useState<{ at: Point; scene: Point; kind: 'point' | 'element' | 'canvas' } | undefined>(
    undefined,
  );
  const openMenu = useCallback(
    (event: React.MouseEvent, kind: 'point' | 'element' | 'canvas') => {
      event.preventDefault();
      event.stopPropagation();
      const rect = rootRef.current?.getBoundingClientRect();
      setMenu({
        at: { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) },
        scene: toScene(event),
        kind,
      });
    },
    [toScene],
  );
  const onPointContextMenu = useCallback(
    (link: SplineLink, index: number, event: React.MouseEvent) => {
      registry.set(atoms.point, { link: link.id, index });
      openMenu(event, 'point');
    },
    [registry, atoms.point, openMenu],
  );
  /** Right-click on an element adds it to the selection unless it is already in it, then offers edit actions. */
  const onElementContextMenu = useCallback(
    (id: ElementId, event: React.MouseEvent) => {
      if (!registry.get(atoms.selection).has(id)) {
        select([id]);
      }
      openMenu(event, 'element');
    },
    [registry, atoms.selection, select, openMenu],
  );
  const onLinkContextMenu = useCallback(
    (link: Link, event: React.MouseEvent) => onElementContextMenu(link.id, event),
    [onElementContextMenu],
  );
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      const node = hitTest(scene, toScene(event));
      if (node) {
        onElementContextMenu(node.id, event);
      } else {
        openMenu(event, 'canvas');
      }
    },
    [scene, toScene, onElementContextMenu, openMenu],
  );

  //
  // Clipboard.
  //

  const copy = useCallback(() => {
    const fragment = copySelection(scene, registry.get(atoms.selection));
    if (fragment) {
      registry.set(atoms.clipboard, fragment);
    }
    return fragment !== undefined;
  }, [scene, registry, atoms.selection, atoms.clipboard]);

  const cut = useCallback(() => {
    if (!capabilities.delete || !copy()) {
      return;
    }
    projection.apply({ kind: 'delete', ids: [...registry.get(atoms.selection)] });
    select([]);
  }, [capabilities.delete, copy, projection, registry, atoms.selection, select]);

  /** Paste one grid step further each time, or with the fragment's top-left at `at` when given. */
  const paste = useCallback(
    (at?: Point) => {
      const fragment = registry.get(atoms.clipboard);
      if (!fragment || !capabilities.create) {
        return;
      }
      const bounds = clipboardBounds(fragment);
      const step = major * (fragment.pasted + 1);
      const offset = at && bounds ? { x: snap(at.x) - bounds.x, y: snap(at.y) - bounds.y } : { x: step, y: step };
      let nodeZ = topZ(Object.values(scene.nodes));
      let linkZ = topZ(Object.values(scene.links));
      const { intent, ids } = pasteFragment({
        clipboard: fragment,
        offset,
        createId,
        nodeZ: () => (nodeZ = between(nodeZ, undefined)),
        linkZ: () => (linkZ = between(linkZ, undefined)),
      });
      projection.apply(intent);
      registry.set(atoms.clipboard, { ...fragment, pasted: at ? fragment.pasted : fragment.pasted + 1 });
      select(ids);
    },
    [registry, atoms.clipboard, capabilities.create, major, snap, scene.nodes, scene.links, projection, select],
  );

  /** Dragging a link's end re-attaches it; the other end stays put and anchors the rubber band. */
  const onEndPointerDown = useCallback(
    (link: Link, end: LinkEnd, event: React.PointerEvent) => {
      if (event.button !== 0 || !capabilities.update) {
        return;
      }
      event.stopPropagation();
      const geometry = linkGeometry(scene, nodeRegistry, link);
      if (!geometry) {
        return;
      }
      const other = end === 'source' ? geometry.target : geometry.source;
      const to = end === 'source' ? geometry.source.point : geometry.target.point;
      startDrag({ kind: 'end', id: link.id, end, fixed: other.point, fixedSide: other.side, to }, event);
    },
    [capabilities.update, scene, nodeRegistry, startDrag],
  );

  /** Double-click on a spline adds a control point there; other link types have no points to edit. */
  const onLinkDoubleClick = useCallback(
    (link: Link, event: React.MouseEvent) => {
      if (link.type !== 'spline' || !capabilities.update) {
        return;
      }
      event.stopPropagation();
      const geometry = linkGeometry(scene, nodeRegistry, link);
      if (!geometry) {
        return;
      }
      const point = toScene(event);
      const index = insertIndex(geometry.source.point, link.points, geometry.target.point, point);
      const points = [
        ...link.points.slice(0, index),
        { x: snap(point.x), y: snap(point.y) },
        ...link.points.slice(index),
      ];
      projection.apply({ kind: 'update', id: link.id, values: { points } });
      select([link.id]);
    },
    [capabilities.update, scene, nodeRegistry, toScene, snap, projection, select],
  );

  /**
   * The drop target for a link end: over a node (with a port-sized margin), the port nearest the pointer
   * among those that accept the end (`in` for a target, `out` for a source); a node with none takes no drop.
   */
  const linkTarget = useCallback(
    (point: Point, exclude: NodeId | undefined, direction: 'in' | 'out'): Endpoint | undefined => {
      const reach = PORT_SNAP_PX / registry.get(atoms.camera).zoom;
      const node = hitTest(scene, point, reach);
      if (!node || node.id === exclude) {
        return undefined;
      }
      const boundsOf = nodeBounds(node);
      let nearest: Port | undefined;
      let best = Infinity;
      for (const candidate of nodePorts(nodeRegistry, node).filter((port) => portAccepts(port, direction))) {
        const value = Math.hypot(...distance(portPoint(boundsOf, candidate), point));
        if (value < best) {
          best = value;
          nearest = candidate;
        }
      }
      // A port claims the drop only while the pointer is within reach of it; anywhere else on the node
      // the link binds to the body, which is also what a node with no port accepting this end takes.
      return nearest && best <= reach ? { node: node.id, port: nearest.id } : { node: node.id };
    },
    [scene, registry, atoms.camera, nodeRegistry],
  );

  // Hover comes from the model with a margin, not from the node element, so it survives the pointer
  // crossing onto a port that sits on the frame edge.
  const updateHover = useCallback(
    (point: Point | undefined) => {
      const zoom = registry.get(atoms.camera).zoom;
      const next = point ? hitTest(scene, point, PORT_SNAP_PX / zoom)?.id : undefined;
      if (registry.get(atoms.hover) !== next) {
        registry.set(atoms.hover, next);
      }
    },
    [registry, atoms.camera, atoms.hover, scene],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const current = registry.get(atoms.drag);
      if (!current) {
        if (!navigatingRef.current) {
          updateHover(toScene(event));
        }
        return;
      }
      switch (current.kind) {
        case 'pan': {
          const zoom = registry.get(atoms.camera).zoom;
          setCamera((camera) =>
            panBy(camera, { x: (event.clientX - current.last.x) / zoom, y: (event.clientY - current.last.y) / zoom }),
          );
          setDrag({ ...current, last: { x: event.clientX, y: event.clientY } });
          break;
        }
        case 'marquee':
        case 'create': {
          const point = toScene(event);
          setDrag({ ...current, to: current.kind === 'create' ? { x: snap(point.x), y: snap(point.y) } : point });
          break;
        }
        case 'move': {
          // Snap the pressed node's top-left to the minor grid; the selection moves by the same offset.
          const point = toScene(event);
          const raw = { x: point.x - current.origin.x, y: point.y - current.origin.y };
          setDrag({
            ...current,
            delta: {
              x: snapMinor(current.anchor.x + raw.x) - current.anchor.x,
              y: snapMinor(current.anchor.y + raw.y) - current.anchor.y,
            },
          });
          break;
        }
        case 'resize': {
          const point = toScene(event);
          const anchor = handlePoint(current.start, current.handle);
          const delta = { x: point.x - anchor.x, y: point.y - anchor.y };
          const node = scene.nodes[current.id];
          const def = node && nodeDef(nodeRegistry, node);
          const bounds = resizeBounds(current.start, current.handle, delta, {
            minSize: def?.minSize ?? { width: major, height: major },
            maxSize: def?.maxSize,
            symmetric: event.shiftKey,
            // The moving edge lands on the minor grid, as a move does: a node's size is no coarser than
            // its position, while a new node still arrives on the major one.
            snap: snapMinor,
          });
          setDrag({ ...current, bounds });
          break;
        }
        case 'link': {
          // The band follows the pointer exactly; it snaps as it lands (`settle`). A free source keeps
          // facing the far end.
          const point = toScene(event);
          const target = linkTarget(point, endpointNode(current.source), 'in');
          const fromSide = isPointEndpoint(current.source) ? sideToward(current.from, point) : current.fromSide;
          setDrag({ ...current, to: point, fromSide, target });
          break;
        }
        case 'point': {
          // A control point moves on the minor grid, as a node does; the double-click that adds one is a
          // creation and stays on the major grid.
          const point = toScene(event);
          const points = [...current.points];
          points[current.index] = { x: snapMinor(point.x), y: snapMinor(point.y) };
          setDrag({ ...current, points });
          break;
        }
        case 'end': {
          const point = toScene(event);
          const link = scene.links[current.id];
          const other = link ? endpointNode(current.end === 'source' ? link.target : link.source) : undefined;
          const target = linkTarget(point, other, current.end === 'source' ? 'out' : 'in');
          setDrag({ ...current, to: point, target });
          break;
        }
      }
    },
    [
      registry,
      atoms.drag,
      atoms.camera,
      setCamera,
      setDrag,
      toScene,
      snap,
      snapMinor,
      scene.nodes,
      scene.links,
      nodeRegistry,
      major,
      linkTarget,
      updateHover,
    ],
  );

  /**
   * A link band follows the pointer exactly while it is drawn; this is where its free ends snap to the
   * major grid, once, as it lands. An end dropped on a node keeps the node.
   */
  const settle = useCallback(
    (current: Drag): Drag => {
      const snapPoint = (point: Point): Point => ({ x: snap(point.x), y: snap(point.y) });
      switch (current.kind) {
        case 'link': {
          const free = isPointEndpoint(current.source);
          const from = free ? snapPoint(current.from) : current.from;
          return {
            ...current,
            from,
            source: free ? { point: from } : current.source,
            to: current.target ? current.to : snapPoint(current.to),
          };
        }
        case 'end':
          return current.target ? current : { ...current, to: snapPoint(current.to) };
        default:
          return current;
      }
    },
    [snap],
  );

  // The node the current create gesture made, re-framed by every ghost frame and by the drop, so a
  // definition whose `create` has effects (a trigger mints an object) runs it once, for the node that lands.
  const pendingRef = useRef<{ type: NodeType; node: Node } | undefined>(undefined);

  /**
   * The node a create drag would make: what was drawn, or the type's default size at the press when the
   * drag was a click. Shared by the ghost preview and the drop, so the preview is what lands.
   */
  const createdNode = useCallback(
    (drag: Extract<Drag, { kind: 'create' }>, id: NodeId): Node | undefined => {
      const def = nodeRegistry[drag.type];
      if (!def) {
        return undefined;
      }
      const drawn = boundsFromPoints(drag.from, drag.to);
      // Dropped from the palette there is no drawn box, so the type's default stands in, scaled to cover
      // the same screen area at any zoom. A box drawn on the canvas is exactly what the pointer swept:
      // it follows the cursor as the frame shows it, and a gesture that snapped to nothing creates nothing
      // rather than planting a default-sized node under the click.
      if (!drag.dropped && (drawn.width === 0 || drawn.height === 0)) {
        return undefined;
      }
      const size = drag.dropped ? viewSize(def.defaultSize, camera.zoom) : { ...drawn };
      const center = drag.dropped
        ? { x: drag.from.x + size.width / 2, y: drag.from.y + size.height / 2 }
        : { x: drawn.x + drawn.width / 2, y: drawn.y + drawn.height / 2 };
      const props: CreateProps = { id, z: topZ(Object.values(scene.nodes)), center, size };
      const pending = pendingRef.current;
      // No `fontSize`: a new node inherits the view's default, as one created by dropping a link does.
      const node: Node = pending?.type === drag.type ? { ...pending.node, ...props } : def.create(props);
      pendingRef.current = { type: drag.type, node };
      return node;
    },
    [nodeRegistry, major, scene.nodes, camera.zoom],
  );

  /** The node the gesture made, committed: the next gesture starts from a fresh `create`. */
  const commitCreated = useCallback(
    (node: Node) => {
      pendingRef.current = undefined;
      // A new portal opens onto a fresh scene of its own, whichever path created it.
      if (isPortalNode(node)) {
        registry.set(store.scenes, {
          ...registry.get(store.scenes),
          [node.scene]: { id: node.scene, name: 'Untitled', nodes: {}, links: {} },
        });
      }
      projection.apply({ kind: 'create', node });
      select([node.id]);
    },
    [projection, select, registry, store],
  );

  /** A gesture abandoned (Escape, a drag leaving the canvas): its pending node is dropped with it. */
  const cancelDrag = useCallback(() => {
    pendingRef.current = undefined;
    setDrag(undefined);
  }, [setDrag]);

  const onPointerUp = useCallback(() => {
    const raw = registry.get(atoms.drag);
    if (!raw) {
      return;
    }
    setDrag(undefined);
    const current = settle(raw);
    switch (current.kind) {
      case 'marquee': {
        const hits = nodesIntersecting(scene, boundsFromPoints(current.from, current.to)).map(({ id }) => id);
        const previous = registry.get(atoms.selection);
        select(
          current.mode === 'add'
            ? [...previous, ...hits]
            : current.mode === 'subtract'
              ? [...previous].filter((id) => !hits.includes(id))
              : hits,
        );
        break;
      }
      case 'move': {
        if (current.delta.x !== 0 || current.delta.y !== 0) {
          projection.apply({ kind: 'move', ids: current.ids, delta: current.delta });
        }
        break;
      }
      case 'resize': {
        projection.apply({ kind: 'resize', id: current.id, bounds: current.bounds });
        break;
      }
      case 'link': {
        let target = current.target;
        if (!target && isPointEndpoint(current.source)) {
          // A free-ended link that never reached a node ends free too; a click without a drag draws nothing.
          if (current.to.x !== current.from.x || current.to.y !== current.from.y) {
            target = { point: current.to };
          }
        } else if (!target && capabilities.create) {
          // Dropping a port drag on empty canvas creates a rectangle there and links to it (canvas-editor
          // behaviour); its top-left is what snaps, so the edges land on the grid.
          const size = DEFAULT_SIZES.rect;
          const node = createNode({
            type: 'rect',
            id: createId('rect'),
            z: topZ(Object.values(scene.nodes)),
            center: {
              x: snap(current.to.x - size.width / 2) + size.width / 2,
              y: snap(current.to.y - size.height / 2) + size.height / 2,
            },
          });
          projection.apply({ kind: 'create', node });
          target = { node: node.id };
        }
        if (target) {
          const link = createLink({
            type: current.type,
            id: createId(current.type),
            z: topZ(Object.values(scene.links)),
            source: current.source,
            target,
            midpoint: { x: snap((current.from.x + current.to.x) / 2), y: snap((current.from.y + current.to.y) / 2) },
            // A link between ports that declare a direction is drawn with one.
            directed: isDirected(scene, nodeRegistry, current.source, target),
          });
          projection.apply({ kind: 'link', link });
        }
        break;
      }
      case 'create': {
        const node = createdNode(current, createId(current.type));
        if (!node) {
          break;
        }
        commitCreated(node);
        setTool({ kind: 'select' });
        break;
      }
      case 'point': {
        projection.apply({ kind: 'update', id: current.id, values: { points: current.points } });
        break;
      }
      case 'end': {
        // Dropped on a node it attaches there; dropped on empty canvas it becomes a free end at that point.
        const end: Endpoint = current.target ?? { point: current.to };
        projection.apply({ kind: 'update', id: current.id, values: { [current.end]: end } });
        break;
      }
      case 'pan':
        break;
    }
  }, [
    registry,
    atoms.drag,
    atoms.selection,
    setDrag,
    scene,
    select,
    projection,
    capabilities.create,
    snap,
    settle,
    store,
    setTool,
    createdNode,
    commitCreated,
  ]);

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
        <div
          className='absolute border border-dashed border-orange-border opacity-50 pointer-events-none'
          data-testid='scene-frame'
          style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
        />
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
      <Menu.Root modal={false} open={menu !== undefined} onOpenChange={(open) => !open && setMenu(undefined)}>
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
            {Math.round(nominalZoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)}) · depth{' '}
            {path.length - 1}
          </NavigationToolbar>
          <ActionToolbar
            classNames='absolute top-2 right-2'
            actions={toolbarActions}
            nodes={nodeRegistry}
            capabilities={capabilities}
          />
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

const distance = (left: Point, right: Point): [number, number] => [left.x - right.x, left.y - right.y];
