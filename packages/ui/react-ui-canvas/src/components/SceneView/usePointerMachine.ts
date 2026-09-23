//
// Copyright 2026 DXOS.org
//

import {
  type MouseEvent,
  type MutableRefObject,
  type PointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';

import { type useRegistry } from '../../hooks/index.ts';
import { type ControlPointRef, type Drag, type Handle, type SceneViewAtoms } from '../../model/atoms.ts';
import { type Projection } from '../../model/projection.ts';
import { type CreateProps, type NodeRegistry, nodeDef } from '../../model/registry.ts';
import { type SceneStore } from '../../model/store.ts';
import {
  type Camera,
  type Capabilities,
  type ElementId,
  type Endpoint,
  type Link,
  MAJOR_GRID,
  type Node,
  type NodeId,
  type NodeType,
  type Point,
  type Port,
  type Scene,
  type Size,
  type SplineLink,
  type Tool,
  endpointNode,
  isPointEndpoint,
  isPortalNode,
} from '../../model/types.ts';
import { boundsCenter, panBy, screenToScene } from '../../utils/camera.ts';
import { boundsFromPoints, hitTest, nodesIntersecting } from '../../utils/hit.ts';
import { topZ } from '../../utils/order.ts';
import { nodePorts, portAccepts, portPoint } from '../../utils/ports.ts';
import { resizeBounds } from '../../utils/resize.ts';
import { insertIndex, linkGeometry, sideToward } from '../../utils/route.ts';
import { DEFAULT_SIZES, createLink, createNode, nodeBounds } from '../../utils/shapes.ts';
import { type LinkEnd, handlePoint } from '../ControlFrame/ControlFrame.tsx';
import { type SceneCamera } from './useSceneCamera.ts';
import { type SceneSnap } from './useSceneSnap.ts';

/** How near a port the pointer must be, in screen px, for the port rather than the body to take a link. */
const PORT_SNAP_PX = 16;

/** The node drawn as a preview during a create drag; it never reaches the model. */
export const PREVIEW_NODE_ID = 'preview-node';

export const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * A type's default size in scene units such that it covers the same screen area whatever the camera is
 * doing. A nested scene is entered at a fraction of the parent's zoom, so a size fixed in scene units
 * arrives a quarter or less of its apparent size there; scaling by the zoom is what keeps a new node the
 * same on screen at every level, and it is stable — unlike the portal's own factor, which grows with the
 * child's bounds and so would feed back into the size of the next node drawn.
 */
export const viewSize = ({ width, height }: Size, zoom: number): Size => ({
  width: Math.max(MAJOR_GRID, Math.round(width / zoom / MAJOR_GRID) * MAJOR_GRID),
  height: Math.max(MAJOR_GRID, Math.round(height / zoom / MAJOR_GRID) * MAJOR_GRID),
});

const distance = (left: Point, right: Point): [number, number] => [left.x - right.x, left.y - right.y];

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

export type ContextMenu = { at: Point; scene: Point; kind: 'point' | 'element' | 'canvas' };

export type UsePointerMachineOptions = {
  registry: ReturnType<typeof useRegistry>;
  atoms: SceneViewAtoms;
  store: SceneStore;
  scene: Scene;
  nodeRegistry: NodeRegistry;
  projection: Projection;
  capabilities: Capabilities;
  camera: Camera;
  rootRef: RefObject<HTMLDivElement | null>;
  /** Set once the user takes the camera over, which stops the view re-fitting itself. */
  interactedRef: MutableRefObject<boolean>;
  select: (ids: Iterable<ElementId>) => void;
} & Pick<SceneCamera, 'setCamera' | 'cancelAnimation' | 'isNavigating'> &
  Pick<SceneSnap, 'major' | 'snap' | 'snapMinor'>;

export type PointerMachine = {
  /** Root element handlers. */
  onBackgroundPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: () => void;
  onContextMenu: (event: MouseEvent) => void;
  /** A gesture abandoned (Escape, a drag leaving the canvas). */
  cancelDrag: () => void;
  updateHover: (point: Point | undefined) => void;

  /** Element handlers, threaded to the layer and the control frame. */
  onNodePointerDown: (node: Node, event: PointerEvent) => void;
  onLinkPointerDown: (link: Link, event: PointerEvent) => void;
  onLinkDoubleClick: (link: Link, event: MouseEvent) => void;
  onLinkContextMenu: (link: Link, event: MouseEvent) => void;
  onHandlePointerDown: (node: Node, handle: Handle, event: PointerEvent) => void;
  onPortPointerDown: (node: Node, port: Port, event: PointerEvent) => void;
  onEndPointerDown: (link: Link, end: LinkEnd, event: PointerEvent) => void;
  onPointPointerDown: (link: SplineLink, index: number, event: PointerEvent) => void;
  onMidpointPointerDown: (link: SplineLink, index: number, point: Point, event: PointerEvent) => void;
  onPointContextMenu: (link: SplineLink, index: number, event: MouseEvent) => void;

  setTool: (next: Tool) => void;
  setDrag: (next: Drag | undefined) => void;
  /** A pointer event's position in scene coordinates. */
  toScene: (event: { clientX: number; clientY: number }) => Point;
  removePoint: (point: ControlPointRef) => void;

  /** The node a create drag would make; the ghost, the frame and the drop all read it. */
  createdNode: (drag: Extract<Drag, { kind: 'create' }>, id: NodeId) => Node | undefined;
  commitCreated: (node: Node) => void;

  menu: ContextMenu | undefined;
  closeMenu: () => void;
  menuAnchorRef: RefObject<HTMLSpanElement | null>;
};

/**
 * Every gesture the canvas takes: what a press starts, what a move does to the drag in flight, and what a
 * release commits. The drag lives in an atom rather than in React state, so a handler reads the gesture it
 * is continuing rather than the one the last render closed over, and the view renders the drag by
 * projecting it onto a copy of the scene.
 */
export const usePointerMachine = ({
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
}: UsePointerMachineOptions): PointerMachine => {
  const toScene = useCallback(
    (event: { clientX: number; clientY: number }): Point => {
      const rect = rootRef.current?.getBoundingClientRect();
      const camera = registry.get(atoms.camera);
      return screenToScene(camera, { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) });
    },
    [registry, atoms.camera, rootRef],
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
    (next: Drag, event: PointerEvent) => {
      interactedRef.current = true;
      cancelAnimation();
      setDrag(next);
      rootRef.current?.setPointerCapture(event.pointerId);
    },
    [cancelAnimation, setDrag, interactedRef, rootRef],
  );

  const onBackgroundPointerDown = useCallback(
    (event: PointerEvent) => {
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
    (id: ElementId, event: PointerEvent): Set<ElementId> => {
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
    (node: Node, event: PointerEvent) => {
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
    (link: Link, event: PointerEvent) => {
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
    (node: Node, handle: Handle, event: PointerEvent) => {
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
    (node: Node, port: Port, event: PointerEvent) => {
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
    (link: SplineLink, index: number, event: PointerEvent) => {
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
    (link: SplineLink, index: number, point: Point, event: PointerEvent) => {
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
  const [menu, setMenu] = useState<ContextMenu | undefined>(undefined);
  const closeMenu = useCallback(() => setMenu(undefined), []);
  const openMenu = useCallback(
    (event: MouseEvent, kind: ContextMenu['kind']) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = rootRef.current?.getBoundingClientRect();
      setMenu({
        at: { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) },
        scene: toScene(event),
        kind,
      });
    },
    [toScene, rootRef],
  );

  const onPointContextMenu = useCallback(
    (link: SplineLink, index: number, event: MouseEvent) => {
      registry.set(atoms.point, { link: link.id, index });
      openMenu(event, 'point');
    },
    [registry, atoms.point, openMenu],
  );

  /** Right-click on an element adds it to the selection unless it is already in it, then offers edit actions. */
  const onElementContextMenu = useCallback(
    (id: ElementId, event: MouseEvent) => {
      if (!registry.get(atoms.selection).has(id)) {
        select([id]);
      }
      openMenu(event, 'element');
    },
    [registry, atoms.selection, select, openMenu],
  );

  const onLinkContextMenu = useCallback(
    (link: Link, event: MouseEvent) => onElementContextMenu(link.id, event),
    [onElementContextMenu],
  );

  const onContextMenu = useCallback(
    (event: MouseEvent) => {
      const node = hitTest(scene, toScene(event));
      if (node) {
        onElementContextMenu(node.id, event);
      } else {
        openMenu(event, 'canvas');
      }
    },
    [scene, toScene, onElementContextMenu, openMenu],
  );

  /** Dragging a link's end re-attaches it; the other end stays put and anchors the rubber band. */
  const onEndPointerDown = useCallback(
    (link: Link, end: LinkEnd, event: PointerEvent) => {
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
    (link: Link, event: MouseEvent) => {
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
    (event: PointerEvent) => {
      const current = registry.get(atoms.drag);
      if (!current) {
        if (!isNavigating()) {
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
      isNavigating,
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
    [nodeRegistry, scene.nodes, camera.zoom],
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
    nodeRegistry,
    setTool,
    createdNode,
    commitCreated,
  ]);

  return {
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
  };
};
