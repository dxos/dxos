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
import { hasCommandKey, isCommandKey, isToolKey, keyAction } from '../../model/keys.ts';
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
  MAJOR_GRID_RATIO,
  type Node,
  type NodeId,
  type NodeType,
  type Point,
  type Port,
  type Scene,
  type SceneId,
  type SplineLink,
  type Tool,
  endpointNode,
  isPointEndpoint,
  isPortalNode,
} from '../../model/types.ts';
import {
  animateCamera,
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
import { Toolbar, type ToolbarActions } from '../Toolbar/Toolbar.tsx';

const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;
const AUTO_DRILL_MS = 150;
/** Quiet time after the last wheel step before the canvas takes pointer events again. */
const NAVIGATION_SETTLE_MS = 150;
const FIT_INSET = 40;
/** Zoom factor of one toolbar step. */
const ZOOM_STEP = 1.25;
/** Minor, major and a coarse level so a far zoom-out still shows a grid. */
const GRID_LEVELS = [1, MAJOR_GRID_RATIO, MAJOR_GRID_RATIO ** 2] as const;
/** Minor cells under 6px are noise; the major grid has no upper bound. */
const GRID_RANGE = [6, Infinity] as const;
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
  /** Minor grid spacing in scene px; snapping uses the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
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

  // The command key held reveals the hovered node's ports; tracked on the window so a press without pointer
  // movement shows them, and cleared on blur so a switch away never leaves them stuck on.
  const [connect, setConnect] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isCommandKey(event.key)) {
        setConnect(event.type === 'keydown');
      }
    };
    const onBlur = () => setConnect(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
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
  const bounds = useMemo(() => frameOf(path, scene), [frameOf, path, scene]);
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
      setCamera(fitBounds(bounds, viewport, FIT_INSET));
    }
  }, [measured, viewport, bounds, setCamera]);

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
        camera = exitPortal(camera, portal, portalFrame(portal, sceneBounds(child)));
        next = next.slice(0, -1);
      }
      registry.set(atoms.path, next);
      select([]);
      setCamera(camera);
      const parent = scenes[next[next.length - 1]];
      if (animate && parent) {
        animateTo(fitBounds(frameOf(next, parent), viewport, FIT_INSET));
      }
      pushHistory({ path: next, camera });
    },
    [registry, atoms.path, atoms.camera, scenes, viewport, animateTo, setCamera, select, pushHistory, frameOf],
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

  const major = grid * MAJOR_GRID_RATIO;
  const snap = useCallback(
    (value: number) => (snapEnabled ? Math.round(value / major) * major : value),
    [snapEnabled, major],
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
    },
    [registry, atoms.tool, atoms.linkType],
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
          const from = { x: snap(point.x), y: snap(point.y) };
          startDrag(
            { kind: 'link', type: currentTool.type, source: { point: from }, from, fromSide: 'e', to: from },
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
      const next = clickSelect(node.id, event);
      if (capabilities.move && !node.locked) {
        const { x, y } = nodeBounds(node);
        const ids = [...next].filter((id) => scene.nodes[id] !== undefined);
        startDrag({ kind: 'move', ids, origin: toScene(event), anchor: { x, y }, delta: { x: 0, y: 0 } }, event);
      }
    },
    [registry, atoms.tool, clickSelect, capabilities.move, scene.nodes, toScene, startDrag],
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
      return nearest ? { node: node.id, port: nearest.id } : undefined;
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
        setConnect(hasCommandKey(event));
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
          // Snap the pressed node's top-left to the grid; the selection moves by the same offset.
          const point = toScene(event);
          const raw = { x: point.x - current.origin.x, y: point.y - current.origin.y };
          setDrag({
            ...current,
            delta: {
              x: snap(current.anchor.x + raw.x) - current.anchor.x,
              y: snap(current.anchor.y + raw.y) - current.anchor.y,
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
            snap,
          });
          setDrag({ ...current, bounds });
          break;
        }
        case 'link': {
          const point = toScene(event);
          const target = linkTarget(point, endpointNode(current.source), 'in');
          // Over free space the band follows the pointer; a free source keeps facing the far end.
          const to = target ? point : { x: snap(point.x), y: snap(point.y) };
          const fromSide = isPointEndpoint(current.source) ? sideToward(current.from, to) : current.fromSide;
          setDrag({ ...current, to, fromSide, target });
          break;
        }
        case 'point': {
          const point = toScene(event);
          const points = [...current.points];
          points[current.index] = { x: snap(point.x), y: snap(point.y) };
          setDrag({ ...current, points });
          break;
        }
        case 'end': {
          const point = toScene(event);
          const link = scene.links[current.id];
          const other = link ? endpointNode(current.end === 'source' ? link.target : link.source) : undefined;
          const target = linkTarget(point, other, current.end === 'source' ? 'out' : 'in');
          setDrag({ ...current, to: target ? point : { x: snap(point.x), y: snap(point.y) }, target });
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
      scene.nodes,
      scene.links,
      nodeRegistry,
      major,
      linkTarget,
      updateHover,
    ],
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
      // A press that moved less than a grid cell on both axes is a click; a drawn box never goes below the type's minimum.
      const clicked = drawn.width < major && drawn.height < major;
      const minSize = def.minSize ?? { width: major, height: major };
      const size = clicked
        ? def.defaultSize
        : { width: Math.max(drawn.width, minSize.width), height: Math.max(drawn.height, minSize.height) };
      const center = clicked
        ? { x: drag.from.x + size.width / 2, y: drag.from.y + size.height / 2 }
        : { x: drawn.x + drawn.width / 2, y: drawn.y + drawn.height / 2 };
      const props: CreateProps = { id, z: topZ(Object.values(scene.nodes)), center, size };
      const pending = pendingRef.current;
      const node: Node = pending?.type === drag.type ? { ...pending.node, ...props } : def.create(props);
      pendingRef.current = { type: drag.type, node };
      return node;
    },
    [nodeRegistry, major, scene.nodes],
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
    const current = registry.get(atoms.drag);
    if (!current) {
      return;
    }
    setDrag(undefined);
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
          animateTo(fitBounds(bounds, viewport, FIT_INSET));
          event.preventDefault();
          break;
        case 'fitSelection': {
          const union = unionBounds(selectedNodes.map((id) => nodeBounds(scene.nodes[id])));
          if (union) {
            animateTo(fitBounds(union, viewport, FIT_INSET));
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
          const step = major * (event.shiftKey ? MAJOR_GRID_RATIO : 1);
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
    if (drag?.kind === 'create') {
      // The type's own view as a ghost, so the preview is the node that will land.
      const node = createdNode(drag, PREVIEW_NODE_ID);
      return node ? reduceIntent(scene, { kind: 'create', node }) : scene;
    }
    return scene;
  }, [scene, drag, createdNode]);

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
      return { kind: 'create', type, from, to: from };
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
      const size = def.defaultSize;
      const from = { x: snap(pointer.x - size.width / 2), y: snap(pointer.y - size.height / 2) };
      const node = createdNode({ kind: 'create', type, from, to: from }, createId(type));
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
      fit: () => animateTo(fitBounds(bounds, viewport, FIT_INSET)),
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
    }),
    [
      path,
      nameOf,
      drillOut,
      animateTo,
      bounds,
      viewport,
      zoomBy,
      snapEnabled,
      toggleSnap,
      debug,
      toggleDebug,
      canUndo,
      canRedo,
      onUndo,
      onRedo,
      selection.size,
      clipboard,
      cut,
      copy,
      paste,
      deleteSelection,
      createAtCentre,
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
      {/* Minor and major grid, always; the minor one goes when its cells get too small to read. */}
      <GridComponent
        size={grid}
        scale={camera.zoom}
        offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }}
        showAxes={false}
        ratios={GRID_LEVELS}
        range={GRID_RANGE}
      />
      <div
        className={mx('absolute pointer-events-none', !measured && 'invisible')}
        style={{ transform: cameraTransform(camera), transformOrigin: '0 0' }}
      >
        <div
          className='absolute border border-dashed border-orange-border pointer-events-none'
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
          showPorts={tool.kind === 'link'}
          connect={connect}
          onHandlePointerDown={onHandlePointerDown}
          onPortPointerDown={onPortPointerDown}
          onEndPointerDown={onEndPointerDown}
          onPointPointerDown={onPointPointerDown}
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
        <Toolbar
          classNames='absolute top-2 left-2'
          actions={toolbarActions}
          nodes={nodeRegistry}
          capabilities={capabilities}
        >
          {Math.round(camera.zoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)}) · depth{' '}
          {path.length - 1}
        </Toolbar>
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
