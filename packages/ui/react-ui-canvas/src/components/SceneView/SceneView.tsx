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
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button, IconButton, Menu, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useRegistry, useSceneProjection, useViewport, useWheel } from '../../hooks/index.ts';
import {
  type ControlPointRef,
  type Drag,
  type Handle,
  type SceneViewAtoms,
  createSceneViewAtoms,
} from '../../model/atoms.ts';
import { type FreehandProjectionOptions, type Projection, reduceIntent } from '../../model/projection.ts';
import {
  type LinkRegistry,
  type NodeRegistry,
  defaultLinkRegistry,
  defaultNodeRegistry,
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
  type Point,
  type Port,
  type Scene,
  type SceneId,
  type Size,
  type SplineLink,
  type Tool,
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
  screenToScene,
  zoomAt,
} from '../../utils/camera.ts';
import { clipboardBounds, copySelection, pasteFragment } from '../../utils/clipboard.ts';
import { boundsFromPoints, hitTest, nodesIntersecting, sceneBounds, unionBounds } from '../../utils/hit.ts';
import { between, topZ } from '../../utils/order.ts';
import { type PartKey, partKey, partText, partValues } from '../../utils/parts.ts';
import { nodePorts, portPoint } from '../../utils/ports.ts';
import { insertIndex, linkGeometry } from '../../utils/route.ts';
import { DEFAULT_SIZES, createLink, createNode, nodeBounds } from '../../utils/shapes.ts';
import { redo, undo } from '../../utils/undo.ts';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs.tsx';
import { ControlFrame, type LinkEnd, handlePoint } from '../ControlFrame/ControlFrame.tsx';
import { GridComponent } from '../Grid/index.ts';
import { Palette, toolForKey } from '../Palette/Palette.tsx';
import { type ElementHandlers, MAX_LIVE_DEPTH, SceneLayer } from '../SceneLayer/SceneLayer.tsx';

const AUTO_ENTER = 0.85;
const AUTO_EXIT = 0.3;
const AUTO_DRILL_MS = 150;
/** Quiet time after the last wheel step before the canvas takes pointer events again. */
const NAVIGATION_SETTLE_MS = 150;
const FIT_INSET = 40;
/** Minor, major and a coarse level so a far zoom-out still shows a grid. */
const GRID_LEVELS = [1, MAJOR_GRID_RATIO, MAJOR_GRID_RATIO ** 2] as const;
/** Minor cells under 6px are noise; the major grid has no upper bound. */
const GRID_RANGE = [6, Infinity] as const;
const PORT_SNAP_PX = 16;
/** Id of the link drawn while a link drag hovers a drop target; never reaches the model. */
const PREVIEW_LINK_ID = 'preview';

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Resize by a handle: the moving edges land on `snap`, the opposite edges stay put. */
const resizeBounds = (
  start: Bounds,
  handle: Handle,
  delta: Point,
  minSize: Size,
  snap: (value: number) => number,
): Bounds => {
  let { x, y, width, height } = start;
  if (handle.includes('e')) {
    width = Math.max(minSize.width, snap(x + width + delta.x) - x);
  }
  if (handle.includes('s')) {
    height = Math.max(minSize.height, snap(y + height + delta.y) - y);
  }
  if (handle.includes('w')) {
    const next = Math.max(minSize.width, x + width - snap(x + delta.x));
    x += width - next;
    width = next;
  }
  if (handle.includes('n')) {
    const next = Math.max(minSize.height, y + height - snap(y + delta.y));
    y += height - next;
    height = next;
  }
  return { x, y, width, height };
};

export type SceneViewProps = ThemedClassName<{
  store: SceneStore;
  root: SceneId;
  nodes?: NodeRegistry;
  links?: LinkRegistry;
  /** Projection per scene; freehand (identity) by default. */
  createProjection?: (options: FreehandProjectionOptions) => Projection;
  /** Externally owned view state, e.g. to drive two views or persist the camera. */
  atoms?: SceneViewAtoms;
  /** Minor grid spacing in scene px; snapping uses the major grid, `MAJOR_GRID_RATIO` times it. */
  grid?: number;
  /** Nested levels below the root that may mount live; deeper portals stay previews (decision 10). */
  liveDepth?: number;
  showPalette?: boolean;
}>;

export const SceneView = ({
  classNames,
  store,
  root,
  nodes: nodeRegistry = defaultNodeRegistry,
  links: linkRegistry = defaultLinkRegistry,
  createProjection,
  atoms: atomsProp,
  grid = DEFAULT_GRID,
  liveDepth = MAX_LIVE_DEPTH,
  showPalette = true,
}: SceneViewProps) => {
  const registry = useRegistry();
  const atoms = useMemo(() => atomsProp ?? createSceneViewAtoms(root), [atomsProp, root]);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewport = useViewport(rootRef);

  const path = useAtomValue(atoms.path);
  const projection = useSceneProjection({ store, atoms, createProjection });
  const scene = useAtomValue(projection.scene);
  const scenes = useAtomValue(store.scenes);
  const camera = useAtomValue(atoms.camera);
  const selection = useAtomValue(atoms.selection);
  const hover = useAtomValue(atoms.hover);
  const selectedPoint = useAtomValue(atoms.point);
  const tool = useAtomValue(atoms.tool);
  const snapEnabled = useAtomValue(atoms.snap);
  const drag = useAtomValue(atoms.drag);
  const undoState = useAtomValue(atoms.undo);
  const clipboard = useAtomValue(atoms.clipboard);
  const editing = useAtomValue(atoms.editing);
  const sceneId = path[path.length - 1];
  const canUndo = undoState.key === sceneId && undoState.past.length > 0;
  const canRedo = undoState.key === sceneId && undoState.future.length > 0;

  const nameOf = useCallback((id: SceneId) => scenes[id]?.name ?? id, [scenes]);
  /** The portal in `parent` that shows `childId`, if any. */
  const portalTo = useCallback(
    (parentId: SceneId | undefined, childId: SceneId): Node | undefined => {
      const parent = parentId ? scenes[parentId] : undefined;
      return parent
        ? Object.values(parent.nodes).find((node) => node.type === 'scene' && node.scene === childId)
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
  const capabilities = projection.capabilities;

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
    if (undo(projection, registry, atoms.undo, sceneId)) {
      select([]);
    }
  }, [projection, registry, atoms.undo, sceneId, select]);
  const onRedo = useCallback(() => {
    if (redo(projection, registry, atoms.undo, sceneId)) {
      select([]);
    }
  }, [projection, registry, atoms.undo, sceneId, select]);

  const drillIn = useCallback(
    (portal: Node, animate = true) => {
      const child = portal.type === 'scene' ? scenes[portal.scene] : undefined;
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
        const target = fitBounds(nodeBounds(portal), viewport);
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
          ? Object.values(parent.nodes).find((node) => node.type === 'scene' && node.scene === child?.id)
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

  // Auto drill: a portal filling the viewport becomes the root; a root shrunk to a corner yields to its parent.
  useEffect(() => {
    if (cancelRef.current || drag || viewport.width === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const portal = Object.values(scene.nodes).find(
        (node) => node.type === 'scene' && coverage(camera, nodeBounds(node), viewport) >= AUTO_ENTER,
      );
      if (portal) {
        drillIn(portal, false);
      } else if (path.length > 1 && coverage(camera, bounds, viewport) < AUTO_EXIT) {
        drillOut(1, false);
      }
    }, AUTO_DRILL_MS);
    return () => clearTimeout(timer);
  }, [camera, scene, bounds, path.length, viewport, drag, drillIn, drillOut]);

  //
  // Pointer state machine.
  //

  const major = grid * MAJOR_GRID_RATIO;
  const snap = useCallback(
    (value: number) => (snapEnabled ? Math.round(value / major) * major : value),
    [snapEnabled, major],
  );
  const toggleSnap = useCallback(() => registry.set(atoms.snap, !registry.get(atoms.snap)), [registry, atoms.snap]);
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
      } else {
        if (!event.shiftKey) {
          select([]);
        }
        startDrag({ kind: 'marquee', from: point, to: point, additive: event.shiftKey }, event);
      }
    },
    [registry, atoms.tool, toScene, startDrag, select, capabilities.create, snap],
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
      if (event.button !== 0 || !capabilities.link) {
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

  /** The drop target for a link end: over a node (with a port-sized margin), the port nearest the pointer. */
  const linkTarget = useCallback(
    (point: Point, exclude: NodeId): Endpoint | undefined => {
      const reach = PORT_SNAP_PX / registry.get(atoms.camera).zoom;
      const node = hitTest(scene, point, reach);
      if (!node || node.id === exclude) {
        return undefined;
      }
      const boundsOf = nodeBounds(node);
      let nearest: Port | undefined;
      let best = Infinity;
      for (const candidate of nodePorts(nodeRegistry, node)) {
        const value = Math.hypot(...distance(portPoint(boundsOf, candidate), point));
        if (value < best) {
          best = value;
          nearest = candidate;
        }
      }
      return nearest ? { node: node.id, port: nearest.id } : { node: node.id };
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
          const minSize = (node && nodeRegistry[node.type].minSize) || { width: major, height: major };
          setDrag({ ...current, bounds: resizeBounds(current.start, current.handle, delta, minSize, snap) });
          break;
        }
        case 'link': {
          const point = toScene(event);
          setDrag({ ...current, to: point, target: linkTarget(point, current.source.node) });
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
          const other = link ? (current.end === 'source' ? link.target.node : link.source.node) : '';
          setDrag({ ...current, to: point, target: linkTarget(point, other) });
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

  const onPointerUp = useCallback(() => {
    const current = registry.get(atoms.drag);
    if (!current) {
      return;
    }
    setDrag(undefined);
    switch (current.kind) {
      case 'marquee': {
        const hits = nodesIntersecting(scene, boundsFromPoints(current.from, current.to)).map(({ id }) => id);
        select(current.additive ? [...registry.get(atoms.selection), ...hits] : hits);
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
        if (!target && capabilities.create) {
          // Dropping on empty canvas creates a rectangle there and links to it (canvas-editor behaviour);
          // its top-left is what snaps, so the edges land on the grid.
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
          });
          projection.apply({ kind: 'link', link });
        }
        break;
      }
      case 'create': {
        const drawn = boundsFromPoints(current.from, current.to);
        // A click without a drag places a default-sized node with its top-left at the click.
        const clicked = drawn.width < major || drawn.height < major;
        const size = clicked ? DEFAULT_SIZES[current.type] : { width: drawn.width, height: drawn.height };
        const center = clicked
          ? { x: current.from.x + size.width / 2, y: current.from.y + size.height / 2 }
          : { x: drawn.x + drawn.width / 2, y: drawn.y + drawn.height / 2 };
        const id = createId(current.type);
        const node = createNode({
          type: current.type,
          id,
          z: topZ(Object.values(scene.nodes)),
          center,
          size,
          scene: current.type === 'scene' ? createId('scene') : undefined,
        });
        if (node.type === 'scene') {
          registry.set(store.scenes, {
            ...registry.get(store.scenes),
            [node.scene]: { id: node.scene, name: 'Untitled', nodes: {}, links: {} },
          });
        }
        projection.apply({ kind: 'create', node });
        select([id]);
        setTool({ kind: 'select' });
        break;
      }
      case 'point': {
        projection.apply({ kind: 'update', id: current.id, values: { points: current.points } });
        break;
      }
      case 'end': {
        // Dropped on nothing: the end stays where it was.
        if (current.target) {
          projection.apply({ kind: 'update', id: current.id, values: { [current.end]: current.target } });
        }
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
    major,
    store,
    setTool,
  ]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const selected = [...registry.get(atoms.selection)];
      const selectedNodes = selected.filter((id) => scene.nodes[id] !== undefined);
      const point = registry.get(atoms.point);
      if (event.key === 'Escape') {
        if (registry.get(atoms.drag)) {
          setDrag(undefined);
        } else if (point) {
          registry.set(atoms.point, undefined);
        } else if (selected.length > 0) {
          select([]);
        } else {
          drillOut();
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && point) {
        removePoint(point);
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length > 0 && capabilities.delete) {
        projection.apply({ kind: 'delete', ids: selected });
        select([]);
      } else if (event.key === 'Enter' && selected.length === 1) {
        const node = scene.nodes[selected[0]];
        if (node && nodeRegistry[node.type].openable) {
          drillIn(node);
        }
      } else if (event.shiftKey && event.key === '!') {
        animateTo(fitBounds(bounds, viewport, FIT_INSET));
      } else if (event.shiftKey && event.key === '@' && selectedNodes.length > 0) {
        const union = unionBounds(selectedNodes.map((id) => nodeBounds(scene.nodes[id])));
        if (union) {
          animateTo(fitBounds(union, viewport, FIT_INSET));
        }
      } else if (event.shiftKey && event.key === ')') {
        animateTo(zoomAt(registry.get(atoms.camera), { x: viewport.width / 2, y: viewport.height / 2 }, 1));
      } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        goHistory(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (event.key.startsWith('Arrow') && selectedNodes.length > 0 && capabilities.move) {
        const step = major * (event.shiftKey ? MAJOR_GRID_RATIO : 1);
        const delta = {
          x: event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          y: event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        };
        projection.apply({ kind: 'move', ids: selectedNodes, delta });
        event.preventDefault();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
        copy();
        event.preventDefault();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'x') {
        cut();
        event.preventDefault();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
        paste();
        event.preventDefault();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        event.preventDefault();
      } else if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        select([...Object.keys(scene.nodes), ...Object.keys(scene.links)]);
        event.preventDefault();
      } else if (event.key === 'g' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        toggleSnap();
      } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const next = toolForKey(nodeRegistry, linkRegistry, capabilities, event.key);
        if (next) {
          setTool(next);
        }
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
    if (drag?.kind === 'link' && drag.target) {
      const link = createLink({
        type: drag.type,
        id: PREVIEW_LINK_ID,
        z: topZ(Object.values(scene.links)),
        source: drag.source,
        target: drag.target,
        midpoint: { x: (drag.from.x + drag.to.x) / 2, y: (drag.from.y + drag.to.y) / 2 },
      });
      return reduceIntent(scene, { kind: 'link', link });
    }
    if (drag?.kind === 'end') {
      // Over a target the link is drawn re-attached; over free space only the rubber band shows.
      return drag.target
        ? reduceIntent(scene, { kind: 'update', id: drag.id, values: { [drag.end]: drag.target } })
        : reduceIntent(scene, { kind: 'delete', ids: [drag.id] });
    }
    return scene;
  }, [scene, drag]);

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
      } else if (nodeRegistry[node.type].openable) {
        drillIn(node);
      }
    },
    [scene, toScene, nodeRegistry, drillIn, capabilities.update, select, registry, atoms.editing],
  );

  const pointer = useMemo(
    () => screenToScene(camera, { x: viewport.width / 2, y: viewport.height / 2 }),
    [camera, viewport],
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
      onPointerCancel={onPointerUp}
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
            opening={opening}
            editing={editing}
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
          showPorts={tool.kind === 'link'}
          onHandlePointerDown={onHandlePointerDown}
          onPortPointerDown={onPortPointerDown}
          onEndPointerDown={onEndPointerDown}
          onPointPointerDown={onPointPointerDown}
          onPointContextMenu={onPointContextMenu}
        />
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

      <div className='absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-sm bg-modal-surface border border-separator text-sm'>
        <Button variant='ghost' density='sm' disabled={path.length < 2} onClick={() => drillOut()}>
          Up
        </Button>
        <Breadcrumbs path={path} nameOf={nameOf} onSelect={(index) => drillOut(path.length - 1 - index)} />
        <Button variant='ghost' density='sm' onClick={() => animateTo(fitBounds(bounds, viewport, FIT_INSET))}>
          Fit
        </Button>
        <Button
          variant='ghost'
          density='sm'
          classNames={mx(snapEnabled && 'bg-primary-500/20')}
          title='Snap (G): snap moves, resizes and new nodes to the major grid'
          onClick={toggleSnap}
        >
          Snap
        </Button>
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--arrow-u-up-left--regular'
          label='Undo (⌘Z)'
          disabled={!canUndo}
          data-testid='undo'
          onClick={onUndo}
        />
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--arrow-u-up-right--regular'
          label='Redo (⇧⌘Z)'
          disabled={!canRedo}
          data-testid='redo'
          onClick={onRedo}
        />
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--scissors--regular'
          label='Cut (⌘X)'
          disabled={selection.size === 0 || !capabilities.delete}
          data-testid='cut'
          onClick={cut}
        />
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--copy--regular'
          label='Copy (⌘C)'
          disabled={selection.size === 0}
          data-testid='copy'
          onClick={copy}
        />
        <IconButton
          variant='ghost'
          iconOnly
          icon='ph--clipboard-text--regular'
          label='Paste (⌘V)'
          disabled={!clipboard || !capabilities.create}
          data-testid='paste'
          onClick={() => paste()}
        />
        <span className='text-description font-mono'>
          {Math.round(camera.zoom * 100)}% · ({Math.round(pointer.x)}, {Math.round(pointer.y)}) · depth{' '}
          {path.length - 1}
        </span>
      </div>
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
