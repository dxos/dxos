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

import {
  type ElementId,
  type Endpoint,
  type Link,
  type Node,
  type NodeId,
  type NodeType,
  type Point,
  type Port,
  type Size,
  type SplineLink,
  endpointNode,
  isInstanceNode,
  isPointEndpoint,
  isPolylineNode,
  isViewNode,
} from '@dxos/scene';

import {
  type BendHandle,
  type CanvasAtoms,
  type ControlPointRef,
  type DocumentEditCommands,
  type Drag,
  type DrawScene,
  type DrawState,
  type Handle,
  type LinkEnd,
  type ToolsCommands,
} from '../../engine/index.ts';
import {
  type Camera,
  type Capabilities,
  type CreateProps,
  type NodeRegistry,
  type RenderList2D,
  type Tool,
  isHandDrag,
  nodeDef,
} from '../../model/index.ts';
import {
  DEFAULT_LAYER,
  FREEHAND_STEP_PX,
  FREEHAND_TOLERANCE_PX,
  NOMINAL_SIZES,
  type RecognizedPath,
  type RecognizedShape,
  type SceneEdit,
  VERTEX_SNAP_PX,
  activeLayer,
  bendsAfterDelete,
  bendsAfterInsert,
  bendsWithVertex,
  between,
  boundsCenter,
  boundsFromPoints,
  chainEdits,
  cloneShape,
  createId,
  createLink,
  createNode,
  favorMajor,
  handlePoint,
  hasVertices,
  hitTest,
  insertIndex,
  insertLink,
  insertNode,
  linkGeometry,
  minPolylineVertices,
  moveNodes,
  nearestSize,
  nodeBounds,
  nodePorts,
  nodesIntersecting,
  nominalSize,
  panBy,
  polylineBends,
  polylineFrame,
  polylineVertices,
  portAccepts,
  portPoint,
  pressSelects,
  readStroke,
  refitPolyline,
  resizeBounds,
  resizeTo,
  screenToScene,
  sideToward,
  simplifyPath,
  smoothBends,
  strokeCloses,
  topOfView,
  updateElement,
} from '../../utils/index.ts';
import { templateComposite } from '../../viewport2d/index.ts';
import { type useRegistry } from '../useRegistry.ts';
import { SCENE_OVERLAY_ATTRIBUTE } from '../useWheel.ts';
import { type EditMode } from './useEditMode.ts';
import { type SceneCamera } from './useSceneCamera.ts';
import { type SceneSnap } from './useSceneSnap.ts';

/** How near a port the pointer must be, in screen px, for the port rather than the body to take a link. */
const PORT_SNAP_PX = 16;

/** The node drawn as a preview during a create drag; it never reaches the model. */
export const PREVIEW_NODE_ID = 'preview-node';

const distance = (left: Point, right: Point): [number, number] => [left.x - right.x, left.y - right.y];

/**
 * Whether a link gesture has gone far enough to be a link: the pointer at least one grid cell (`minimum`,
 * scene units) from where it started. Short of that it is a click, so it neither previews nor lands. It is
 * the pointer that is measured, not the link's ends: a free end snaps to the grid, so a pointer that moved a
 * pixel across a grid line would otherwise have drawn a link a whole cell long.
 */
export const isLinkDrawn = ({ press, pointer }: { press: Point; pointer: Point }, minimum: number): boolean =>
  Math.hypot(pointer.x - press.x, pointer.y - press.y) >= minimum;

/**
 * Where a dragged link end lands: on what the pointer was over, else as a free end at the point it was dropped. Nothing
 * for a press released where it began, so pressing an end does not detach it from its port.
 */
export const endDrop = ({
  to,
  target,
  moved,
}: {
  to: Point;
  target?: Endpoint;
  moved?: boolean;
}): Endpoint | undefined => (moved ? (target ?? { point: to }) : undefined);

/**
 * Whether the pointer is over the canvas itself: not over a panel the view hosts, nor over a popup portalled from one,
 * whose events React still bubbles to the view. Content embedded in a node is part of the canvas.
 */
const overCanvas = (target: EventTarget | null, root: HTMLElement | null): boolean => {
  if (!(target instanceof Element) || !root?.contains(target)) {
    return false;
  }
  const overlay = target.closest(`[${SCENE_OVERLAY_ATTRIBUTE}]`);
  return !overlay || overlay.closest('[data-node-id]') !== null;
};

/** Whether a link between two endpoints has a direction: either pinned port declares `in` or `out`. */
const isDirected = (scene: RenderList2D, registry: NodeRegistry, source: Endpoint, target: Endpoint): boolean =>
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
  atoms: CanvasAtoms;
  /** Returns to Select once a creation gesture lands. */
  setTool: ToolsCommands['setTool'];
  /** Drops a copy of the dragged nodes where the drag ends (⌘-drag). */
  duplicate: DocumentEditCommands['duplicate'];
  store: DrawState;
  scene: RenderList2D;
  nodeRegistry: NodeRegistry;
  draw: DrawScene;
  capabilities: Capabilities;
  camera: Camera;
  rootRef: RefObject<HTMLDivElement | null>;
  /** Set once the user takes the camera over, which stops the view re-fitting itself. */
  interactedRef: MutableRefObject<boolean>;
  select: (ids: Iterable<ElementId>) => void;
  /** Scene px of one nominal unit (the model's major grid cell), which a new node's default size is counted in. */
  cell: number;
} & Pick<SceneCamera, 'setCamera' | 'cancelAnimation' | 'isNavigating'> &
  Pick<SceneSnap, 'minor' | 'major' | 'snap' | 'isClick' | 'moveDelta'> &
  Pick<EditMode, 'exitEdit'>;

export type PointerMachine = {
  /** Root element handlers. */
  onBackgroundPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  /** Ends the gesture in flight; `event` is the release (absent for a drop from outside the canvas). */
  onPointerUp: (event?: { clientX: number; clientY: number }) => void;
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
  /** The menu of a link pressed on one of its ends, which would else be the menu of the node the end is on. */
  onEndContextMenu: (link: Link, event: MouseEvent) => void;
  /** A vertex of the node in vertex edit mode: press marks it, drag moves it, alt-click removes it. */
  onVertexPointerDown: (node: Node, index: number, event: PointerEvent) => void;
  /** A segment's midpoint in vertex edit mode: pressing it adds a vertex there, `index`, and moves it. */
  onVertexMidpointPointerDown: (node: Node, index: number, point: Point, event: PointerEvent) => void;
  /** The control of a bent segment in vertex edit mode: dragging it changes how the segment bows. */
  onBendPointerDown: (node: Node, segment: number, handle: BendHandle, event: PointerEvent) => void;
  /** Removes a vertex of the node in vertex edit mode, unless the node would be left with too few to draw. */
  deleteVertex: (id: NodeId, index: number) => void;

  setDrag: (next: Drag | undefined) => void;
  /** A pointer event's position in scene coordinates. */
  toScene: (event: { clientX: number; clientY: number }) => Point;
  removePoint: (point: ControlPointRef) => void;

  /** Ends a vertex-by-vertex drawing: with two vertices or more it lands as a node, `closed` or open; else it is dropped. */
  finishVertices: (closed: boolean) => void;
  /** Takes back the last vertex placed; with none left the drawing is dropped. */
  removeVertex: () => void;

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
  setTool,
  duplicate,
  store,
  scene,
  nodeRegistry,
  draw,
  capabilities,
  camera,
  rootRef,
  interactedRef,
  select,
  setCamera,
  cancelAnimation,
  isNavigating,
  cell,
  minor,
  major,
  snap,
  isClick,
  moveDelta,
  exitEdit,
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

  const startDrag = useCallback(
    (next: Drag, event: PointerEvent) => {
      interactedRef.current = true;
      cancelAnimation();
      // A gesture has no hover: the pointer is captured, so the highlight would stick to where it began.
      registry.set(atoms.hover, undefined);
      // Any gesture but a pan or a vertex's own is a press outside the node being edited.
      if (next.kind !== 'pan' && next.kind !== 'vertex') {
        exitEdit();
      }
      setDrag(next);
      rootRef.current?.setPointerCapture(event.pointerId);
    },
    [cancelAnimation, setDrag, interactedRef, rootRef, registry, atoms.hover, exitEdit],
  );

  /**
   * Lands a line drawn through `points` as a node of the tool `type`, framed by them; fewer than two make nothing.
   * A line placed vertex by vertex is selected and the tool put down. A `stroke` drawn freehand is one of several, so
   * the tool stays in hand and nothing is selected, whose handles would sit over the next stroke.
   */
  const landPoints = useCallback(
    (type: NodeType, points: readonly Point[], closed: boolean, stroke = false) => {
      const def = nodeRegistry[type];
      // The frame needs some extent on each axis to scale the line by, so a straight run gets a minor cell.
      const shut = closed && points.length >= 3;
      // A tool that draws a curve bends every segment, so the line runs through its points as one.
      const frame =
        points.length >= 2 ? polylineFrame(points, minor, def?.curved ? smoothBends(points, shut) : []) : undefined;
      if (!def?.createFromPoints || !frame) {
        return;
      }
      const { bounds } = frame;
      const node = def.createFromPoints(
        {
          id: createId(type),
          z: topOfView(scene),
          center: boundsCenter(bounds),
          size: { width: bounds.width, height: bounds.height },
        },
        frame.points,
        shut,
      );
      draw.apply(
        insertNode({
          ...node,
          ...(frame.bends.length > 0 ? { bends: frame.bends } : {}),
          layer: activeLayer(scene, registry.get(atoms.layer)),
        }),
      );
      if (!stroke) {
        select([node.id]);
        setTool({ kind: 'select' });
      }
    },
    [nodeRegistry, minor, scene, draw, registry, atoms.layer, select, setTool],
  );

  /** The size of the last shape of each type a gesture made, which a shape drawn nearly that size takes. */
  const lastSizeRef = useRef<Readonly<Record<NodeType, Size>>>({});

  /**
   * Lands a shape read from a stroke as the node that draws it, on the grid whatever the snap setting: a shape drawn
   * by hand is rough, and squaring it up is the point of reading it. Its sides and its edges take a major line of the
   * grid where one is near, and a minor one otherwise. False where the registry has no such type.
   */
  const landShape = useCallback(
    ({ shape, bounds, rotation }: RecognizedShape): boolean => {
      const type = shape === 'rect' || shape === 'ellipse' ? shape : 'polygon';
      const def = nodeRegistry[type];
      if (!def) {
        return false;
      }
      const onGrid = (value: number) => favorMajor(value, minor, major);
      const turned = ({ width, height }: Size): Size => ({ width: height, height: width });
      // A triangle on its side is the upright one turned, so its frame is the box turned back.
      const sideways = rotation === 90 || rotation === 270;
      const drawn = {
        width: Math.max(minor, onGrid(bounds.width)),
        height: Math.max(minor, onGrid(bounds.height)),
      };
      // Nearly the size of the last such shape, or of the tool's own, it was meant to match, and takes that size.
      const size = nearestSize(sideways ? turned(drawn) : drawn, [
        lastSizeRef.current[type],
        nominalSize(def.defaultSize, cell),
      ]);
      // The box the frame covers, about the middle of the stroke, with its edges on the grid.
      const box = sideways ? turned(size) : size;
      const middle = boundsCenter(bounds);
      const [left, top] = [onGrid(middle.x - box.width / 2), onGrid(middle.y - box.height / 2)];
      const node = def.create({
        id: createId(type),
        z: topOfView(scene),
        center: { x: left + box.width / 2, y: top + box.height / 2 },
        size,
      });
      lastSizeRef.current = { ...lastSizeRef.current, [type]: size };
      draw.apply(
        insertNode({
          ...node,
          ...(type === 'polygon' ? { params: { sides: shape === 'triangle' ? 3 : 4 } } : {}),
          ...(rotation !== undefined ? { rotation } : {}),
          layer: activeLayer(scene, registry.get(atoms.layer)),
        }),
      );
      return true;
    },
    [nodeRegistry, minor, major, cell, scene, draw, registry, atoms.layer],
  );

  /**
   * Lands a stroke read as segments as a polyline through their ends, which are on the grid already; a segment that
   * bows is one of its bends. False where the registry has no polyline to draw it.
   */
  const landPath = useCallback(
    ({ points, bends, closed }: RecognizedPath): boolean => {
      const def = nodeRegistry.polyline;
      const frame = polylineFrame(points, minor, bends);
      if (!def?.createFromPoints || !frame) {
        return false;
      }
      const { bounds } = frame;
      const node = def.createFromPoints(
        {
          id: createId('polyline'),
          z: topOfView(scene),
          center: boundsCenter(bounds),
          size: { width: bounds.width, height: bounds.height },
        },
        frame.points,
        closed,
      );
      draw.apply(
        insertNode({
          ...node,
          ...(frame.bends.length > 0 ? { bends: frame.bends } : {}),
          layer: activeLayer(scene, registry.get(atoms.layer)),
        }),
      );
      return true;
    },
    [nodeRegistry, minor, scene, draw, registry, atoms.layer],
  );

  /** The type the tool in hand draws in one stroke (`NodeDef.freehand`), where it is such a tool and may draw. */
  const strokeType = useCallback(
    (tool: Tool): NodeType | undefined =>
      tool.kind === 'node' && capabilities.create && nodeRegistry[tool.type]?.freehand ? tool.type : undefined,
    [capabilities.create, nodeRegistry],
  );

  /** A stroke starts where the pointer is, not on the grid: a line drawn freehand follows the hand. */
  const startStroke = useCallback(
    (type: NodeType, event: PointerEvent) => {
      select([]);
      startDrag({ kind: 'freehand', type, points: [toScene(event)], times: [event.timeStamp] }, event);
    },
    [select, startDrag, toScene],
  );

  const finishVertices = useCallback(
    (closed: boolean) => {
      const drawing = registry.get(atoms.drag);
      if (drawing?.kind !== 'vertices') {
        return;
      }
      setDrag(undefined);
      landPoints(drawing.type, drawing.points, closed);
    },
    [registry, atoms.drag, setDrag, landPoints],
  );

  const removeVertex = useCallback(() => {
    const drawing = registry.get(atoms.drag);
    if (drawing?.kind !== 'vertices') {
      return;
    }
    setDrag(drawing.points.length > 1 ? { ...drawing, points: drawing.points.slice(0, -1) } : undefined);
  }, [registry, atoms.drag, setDrag]);

  /**
   * A press while drawing vertex by vertex: on the first vertex it closes the line, anywhere else but the last vertex
   * it places the next one. A press on the last is the second of a double-click, which ends the line open (`dblclick`).
   */
  const onDrawingPointerDown = useCallback(
    (drawing: Extract<Drag, { kind: 'vertices' }>, point: Point, event: PointerEvent) => {
      event.stopPropagation();
      if (event.button !== 0) {
        return;
      }
      const reach = VERTEX_SNAP_PX / registry.get(atoms.camera).zoom;
      const vertex = { x: snap(point.x), y: snap(point.y) };
      // Where the press would place a vertex counts too: with snap on, that is where the user sees it land.
      const near = (placed: Point) =>
        Math.hypot(...distance(placed, point)) <= reach || Math.hypot(...distance(placed, vertex)) <= reach;
      const { points } = drawing;
      if (points.length >= 3 && near(points[0])) {
        finishVertices(true);
      } else if (!near(points[points.length - 1])) {
        startDrag({ ...drawing, points: [...points, vertex], to: vertex }, event);
      }
    },
    [registry, atoms.camera, finishVertices, snap, startDrag],
  );

  const onBackgroundPointerDown = useCallback(
    (event: PointerEvent) => {
      const currentTool = registry.get(atoms.tool);
      const point = toScene(event);
      const drawing = registry.get(atoms.drag);
      if (drawing?.kind === 'vertices') {
        // A drawing in progress takes every press, over a shape as on the canvas, until it ends or its tool is put down.
        if (currentTool.kind === 'node' && currentTool.type === drawing.type) {
          onDrawingPointerDown(drawing, point, event);
          return;
        }
        setDrag(undefined);
      }
      if (event.target !== event.currentTarget) {
        return;
      }
      const stroke = strokeType(currentTool);
      if (event.button === 1 || currentTool.kind === 'hand' || isHandDrag(event)) {
        startDrag({ kind: 'pan', last: { x: event.clientX, y: event.clientY } }, event);
      } else if (event.button !== 0) {
        return;
      } else if (stroke !== undefined) {
        startStroke(stroke, event);
      } else if (currentTool.kind === 'node') {
        if (capabilities.create && nodeRegistry[currentTool.type]?.createFromPoints) {
          select([]);
          const vertex = { x: snap(point.x), y: snap(point.y) };
          startDrag({ kind: 'vertices', type: currentTool.type, points: [vertex], to: vertex }, event);
        } else if (capabilities.create) {
          const from = { x: snap(point.x), y: snap(point.y) };
          startDrag({ kind: 'create', type: currentTool.type, from, to: from }, event);
        }
      } else if (currentTool.kind === 'link') {
        // A link tool on empty canvas draws a free-ended link (decision 3); dropping on a node attaches that end.
        // The free end starts on the grid, as it lands on it, so the line is drawn from where it will be.
        if (capabilities.link) {
          const from = { x: snap(point.x), y: snap(point.y) };
          startDrag(
            {
              kind: 'link',
              type: currentTool.type,
              source: { point: from },
              from,
              fromSide: 'e',
              to: from,
              press: point,
              pointer: point,
            },
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
    [
      registry,
      atoms.tool,
      atoms.drag,
      toScene,
      startDrag,
      select,
      capabilities.create,
      capabilities.link,
      snap,
      snap,
      nodeRegistry,
      onDrawingPointerDown,
      setDrag,
      strokeType,
      startStroke,
    ],
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

  /** Makes a node's embedded content live (`CanvasAtoms.active`), when it has any. */
  const activate = useCallback(
    (id: NodeId) => {
      // Escaped: a host's node id may hold characters a selector would misread.
      if (rootRef.current?.querySelector(`[data-node-id="${CSS.escape(id)}"] [${SCENE_OVERLAY_ATTRIBUTE}]`)) {
        registry.set(atoms.active, id);
      }
    },
    [rootRef, registry, atoms.active],
  );

  const onNodePointerDown = useCallback(
    (node: Node, event: PointerEvent) => {
      const currentTool = registry.get(atoms.tool);
      // A drawing in progress (a polyline's vertices) takes the press where the canvas does.
      if (
        (!pressSelects(currentTool) && currentTool.kind !== 'link') ||
        event.button !== 0 ||
        registry.get(atoms.drag)?.kind === 'vertices'
      ) {
        return;
      }
      event.stopPropagation();
      // A stroke is drawn over whatever is there, as on paper: the shape under the press is not picked up.
      const stroke = strokeType(currentTool);
      if (stroke !== undefined) {
        startStroke(stroke, event);
        return;
      }
      exitEdit(node.id);
      // A node in vertex edit mode holds still under a press: its vertices are what move.
      const editing = registry.get(atoms.editing);
      if (editing?.kind === 'vertices' && editing.id === node.id) {
        return;
      }
      // With a link tool the body is a source like a port is, so a link can be drawn between two shapes
      // without aiming at their dots; the endpoint carries no port and routing picks the side.
      if (currentTool.kind === 'link' && capabilities.link) {
        const from = toScene(event);
        // The band leaves the side of the node the press is nearest; routing picks the real side on drop.
        const fromSide = sideToward(boundsCenter(nodeBounds(node)), from);
        startDrag(
          {
            kind: 'link',
            type: currentTool.type,
            source: { node: node.id },
            from,
            fromSide,
            to: from,
            press: from,
            pointer: from,
          },
          event,
        );
        return;
      }
      const next = clickSelect(node.id, event);
      // A press on the content of the active node (its own toolbar or editor) starts no move: the drag's pointer
      // capture would take the click from that content's controls. Inactive, the content is inert and the node moves.
      const embedded = event.target instanceof Element && event.target.closest(`[${SCENE_OVERLAY_ATTRIBUTE}]`);
      if (embedded && registry.get(atoms.active) === node.id) {
        return;
      }
      if (capabilities.move && !node.locked) {
        const { x, y } = nodeBounds(node);
        const ids = [...next].filter((id) => scene.nodes[id] !== undefined);
        startDrag(
          { kind: 'move', ids, origin: toScene(event), anchor: { x, y }, delta: { x: 0, y: 0 }, copy: event.metaKey },
          event,
        );
      } else if (next.size === 1) {
        // A node that cannot move has no drag to end in a click, so the press itself activates it.
        activate(node.id);
      }
    },
    [
      registry,
      atoms.tool,
      atoms.active,
      atoms.editing,
      exitEdit,
      activate,
      clickSelect,
      capabilities.move,
      capabilities.link,
      scene.nodes,
      toScene,
      startDrag,
      strokeType,
      startStroke,
    ],
  );

  const onLinkPointerDown = useCallback(
    (link: Link, event: PointerEvent) => {
      const currentTool = registry.get(atoms.tool);
      if (currentTool.kind === 'hand' || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      exitEdit();
      clickSelect(link.id, event);
    },
    [registry, atoms.tool, clickSelect, exitEdit],
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
        {
          kind: 'link',
          type,
          source: { node: node.id, port: port.id },
          from,
          fromSide: port.side,
          to: from,
          // Measured from the port, as the band is drawn from it.
          press: from,
          pointer: from,
        },
        event,
      );
    },
    [capabilities.link, registry, atoms.tool, atoms.linkType, startDrag],
  );

  const removePoint = useCallback(
    ({ link: id, index }: ControlPointRef) => {
      const link = scene.links[id];
      if (link?.type === 'spline' && capabilities.update) {
        draw.apply(updateElement(id, { points: link.points.filter((_, i) => i !== index) }));
      }
      registry.set(atoms.point, undefined);
    },
    [scene.links, capabilities.update, draw, registry, atoms.point],
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

  const deleteVertex = useCallback(
    (id: NodeId, index: number) => {
      const node = scene.nodes[id];
      if (!node || !hasVertices(node) || !capabilities.update) {
        return;
      }
      const closed = isPolylineNode(node) && node.params?.closed === true;
      const vertices = polylineVertices(node);
      registry.set(atoms.editing, { id, kind: 'vertices' });
      if (vertices.length <= minPolylineVertices(closed)) {
        return;
      }
      const values = refitPolyline(
        node,
        vertices.filter((_, i) => i !== index),
        minor,
        bendsAfterDelete(polylineBends(node), index, vertices),
      );
      if (values) {
        draw.apply(updateElement(id, values));
      }
    },
    [scene.nodes, capabilities.update, registry, atoms.editing, minor, draw],
  );

  const onVertexPointerDown = useCallback(
    (node: Node, index: number, event: PointerEvent) => {
      if (event.button !== 0 || !capabilities.update || !hasVertices(node)) {
        return;
      }
      event.stopPropagation();
      if (event.altKey) {
        deleteVertex(node.id, index);
        return;
      }
      registry.set(atoms.editing, { id: node.id, kind: 'vertices', vertex: index });
      startDrag(
        { kind: 'vertex', id: node.id, index, points: polylineVertices(node), bends: polylineBends(node) },
        event,
      );
    },
    [capabilities.update, deleteVertex, registry, atoms.editing, startDrag],
  );

  const onVertexMidpointPointerDown = useCallback(
    (node: Node, index: number, point: Point, event: PointerEvent) => {
      if (event.button !== 0 || !capabilities.update || !hasVertices(node)) {
        return;
      }
      event.stopPropagation();
      const vertices = polylineVertices(node);
      registry.set(atoms.editing, { id: node.id, kind: 'vertices', vertex: index });
      startDrag(
        {
          kind: 'vertex',
          id: node.id,
          index,
          points: [...vertices.slice(0, index), point, ...vertices.slice(index)],
          bends: bendsAfterInsert(polylineBends(node), index, vertices),
        },
        event,
      );
    },
    [capabilities.update, registry, atoms.editing, startDrag],
  );

  const onBendPointerDown = useCallback(
    (node: Node, segment: number, handle: BendHandle, event: PointerEvent) => {
      if (event.button !== 0 || !capabilities.update || !hasVertices(node)) {
        return;
      }
      event.stopPropagation();
      // No vertex is marked: Delete then takes the node, not a vertex beside the control.
      registry.set(atoms.editing, { id: node.id, kind: 'vertices' });
      startDrag(
        {
          kind: 'vertex',
          id: node.id,
          index: segment,
          bend: segment,
          handle,
          points: polylineVertices(node),
          bends: polylineBends(node),
        },
        event,
      );
    },
    [capabilities.update, registry, atoms.editing, startDrag],
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
      // A press that opens the menu is no gesture: a control-click is the primary button, and has begun one.
      if (registry.get(atoms.drag)?.kind !== 'vertices') {
        pendingRef.current = undefined;
        setDrag(undefined);
      }
      const rect = rootRef.current?.getBoundingClientRect();
      setMenu({
        at: { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) },
        scene: toScene(event),
        kind,
      });
    },
    [toScene, rootRef, registry, atoms.drag, setDrag],
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

  const onEndContextMenu = onLinkContextMenu;

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
      draw.apply(updateElement(link.id, { points }));
      select([link.id]);
    },
    [capabilities.update, scene, nodeRegistry, toScene, snap, draw, select],
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
          updateHover(overCanvas(event.target, rootRef.current) ? toScene(event) : undefined);
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
            raw,
            delta: moveDelta(current.anchor, raw),
            // Read on every move, so pressing or releasing ⌘ mid-drag switches between moving and copying.
            copy: event.metaKey && capabilities.create === true,
          });
          break;
        }
        case 'resize': {
          const point = toScene(event);
          const anchor = handlePoint(current.start, current.handle);
          const delta = { x: point.x - anchor.x, y: point.y - anchor.y };
          const node = scene.nodes[current.id];
          const def = node && nodeDef(nodeRegistry, node);
          const bounds = isClick(delta)
            ? current.start
            : resizeBounds(current.start, current.handle, delta, {
                minSize: def?.minSize ?? { width: major, height: major },
                maxSize: def?.maxSize,
                symmetric: event.shiftKey,
                // The moving edge lands on the grid, as a move does, so a node's edges stay on its lines.
                snap,
              });
          setDrag({ ...current, bounds });
          break;
        }
        case 'link': {
          // Everything the drop makes is one undo step, so the node it creates and the link to it go together.
          // The far end is drawn where it will land: on the port or node under the pointer, else on the grid, so the
          // pointer pulls it from one to the next rather than carrying it between them. A free source keeps facing it.
          const point = toScene(event);
          const target = linkTarget(point, endpointNode(current.source), 'in');
          const to = target ? point : { x: snap(point.x), y: snap(point.y) };
          const fromSide = isPointEndpoint(current.source) ? sideToward(current.from, to) : current.fromSide;
          setDrag({ ...current, to, pointer: point, fromSide, target });
          break;
        }
        case 'vertices': {
          // The next segment follows the pointer to where a press would place its vertex.
          const point = toScene(event);
          setDrag({ ...current, to: { x: snap(point.x), y: snap(point.y) } });
          break;
        }
        case 'freehand': {
          // A sample every few px of travel on screen: enough to follow the hand, without one per pointer event.
          const point = toScene(event);
          const last = current.points[current.points.length - 1];
          const step = FREEHAND_STEP_PX / registry.get(atoms.camera).zoom;
          if (Math.hypot(point.x - last.x, point.y - last.y) >= step) {
            setDrag({ ...current, points: [...current.points, point], times: [...current.times, event.timeStamp] });
          }
          break;
        }
        case 'vertex': {
          // A vertex lands on the minor grid, as the polyline tool places one; a bend's control too.
          const point = toScene(event);
          const landed = { x: snap(point.x), y: snap(point.y) };
          if (current.bend !== undefined) {
            const bends = current.bends.map((bend) =>
              bend.segment === current.bend ? { ...bend, [current.handle ?? 'control']: landed } : bend,
            );
            setDrag({ ...current, bends });
            break;
          }
          const points = [...current.points];
          const from = points[current.index];
          points[current.index] = landed;
          // The vertex's own controls go with it, so the curve keeps its shape there.
          const bends = bendsWithVertex(current.bends, current.index, points.length, {
            x: landed.x - from.x,
            y: landed.y - from.y,
          });
          setDrag({ ...current, points, bends });
          break;
        }
        case 'point': {
          // A control point moves on the minor grid, finer than a node; the double-click that adds one is a
          // creation and stays on the major grid.
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
          // As a new link's far end: where it will land, on what is under the pointer or else on the grid.
          setDrag({ ...current, to: target ? point : { x: snap(point.x), y: snap(point.y) }, target, moved: true });
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
      snap,
      isClick,
      moveDelta,
      scene.nodes,
      scene.links,
      nodeRegistry,
      major,
      linkTarget,
      updateHover,
      isNavigating,
      capabilities.create,
      rootRef,
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
      // Dropped from the palette there is no drawn box, so the type's default size stands in, in scene
      // units whatever the zoom. A box drawn on the canvas is exactly what the pointer swept:
      // it follows the cursor as the frame shows it, and a gesture that snapped to nothing creates nothing
      // rather than planting a default-sized node under the click.
      if (!drag.dropped && (drawn.width === 0 || drawn.height === 0)) {
        return undefined;
      }
      const size = drag.dropped ? nominalSize(def.defaultSize, cell) : { width: drawn.width, height: drawn.height };
      const center = drag.dropped
        ? { x: drag.from.x + size.width / 2, y: drag.from.y + size.height / 2 }
        : { x: drawn.x + drawn.width / 2, y: drawn.y + drawn.height / 2 };
      const props: CreateProps = { id, z: topOfView(scene), center, size };
      const pending = pendingRef.current;
      // No `fontSize`: a new node inherits the view's default, as one created by dropping a link does.
      const reused = pending?.type === drag.type ? { ...pending.node, ...props } : undefined;
      // A frame's scene is minted from its id, so it follows the id the node lands with; kept from the ghost, every frame
      // drawn would open onto the ghost's one scene.
      const node: Node = !reused
        ? def.create(props)
        : isViewNode(reused) && pending && isViewNode(pending.node) && pending.node.scene === pending.node.id
          ? { ...reused, scene: id }
          : reused;
      pendingRef.current = { type: drag.type, node };
      return node;
    },
    // `topOfView` reads the links too, so a link added since would otherwise leave a stale key behind.
    [nodeRegistry, scene.nodes, scene.links, cell],
  );

  /**
   * The edit that adds a new node, with the scene a new portal opens onto registered as a side effect; a gesture that
   * makes more than one element chains the edits so they land, and undo, as one.
   */
  const nodeEdit = useCallback(
    (node: Node): SceneEdit => {
      // A tool's first shape brings its template into the drawing; every later one is another instance of that same
      // composite, which is what makes a style edit on one reach them all.
      if (isInstanceNode(node) && !registry.get(store.views)[node.composite]) {
        const definition = templateComposite(nodeRegistry, node.composite);
        if (definition) {
          registry.set(store.views, { ...registry.get(store.views), [definition.id]: definition });
        }
      }
      if (isViewNode(node)) {
        registry.set(store.views, {
          ...registry.get(store.views),
          [node.scene]: {
            id: node.scene,
            nodes: {},
            links: {},
            layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER },
          },
        });
      }
      return insertNode({ ...node, layer: activeLayer(scene, registry.get(atoms.layer)) });
    },
    [registry, store, scene, atoms.layer],
  );

  /** Adds a new node; a new portal opens onto a fresh scene of its own, whichever path created it. */
  const addNode = useCallback((node: Node) => draw.apply(nodeEdit(node)), [draw, nodeEdit]);

  /** The node the gesture made, committed: the next gesture starts from a fresh `create`. */
  const commitCreated = useCallback(
    (node: Node) => {
      pendingRef.current = undefined;
      lastSizeRef.current = { ...lastSizeRef.current, [node.type]: node.size };
      addNode(node);
      select([node.id]);
    },
    [addNode, select],
  );

  /** A gesture abandoned (Escape, a drag leaving the canvas): its pending node is dropped with it. */
  const cancelDrag = useCallback(() => {
    pendingRef.current = undefined;
    setDrag(undefined);
  }, [setDrag]);

  const onPointerUp = useCallback(
    (event?: { clientX: number; clientY: number }) => {
      const raw = registry.get(atoms.drag);
      // A drawing placed vertex by vertex outlasts each press.
      if (!raw || raw.kind === 'vertices') {
        return;
      }
      setDrag(undefined);
      // Hover is not tracked during a captured drag, so it still names the node the gesture started on; re-read it where
      // the pointer was released, from the element there, since a captured event's target is the root.
      const released = event && rootRef.current?.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      updateHover(event && overCanvas(released ?? null, rootRef.current) ? toScene(event) : undefined);
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
          if (current.delta.x === 0 && current.delta.y === 0) {
            // A click (a press that never moved) on a node with embedded content makes that content live.
            if (current.ids.length === 1) {
              activate(current.ids[0]);
            }
            break;
          }
          // ⌘-drag leaves the selection where it was and drops a copy, which becomes the selection.
          if (!current.copy || !duplicate(current.ids, current.delta)) {
            draw.apply(moveNodes(current.ids, current.delta));
          }
          break;
        }
        case 'resize': {
          draw.apply(resizeTo(current.id, current.bounds));
          break;
        }
        case 'link': {
          // A press that moved less than a grid cell is a click, not a link: with a link tool selected,
          // pressing and releasing draws nothing. Read from the raw gesture, since settling has already
          // snapped the landing point away from it.
          if (raw.kind === 'link' && !isLinkDrawn(raw, minor)) {
            // A click on the background with a link tool is a way out of the tool, as Escape is.
            if (isPointEndpoint(raw.source)) {
              setTool({ kind: 'select' });
            }
            break;
          }
          let target = current.target;
          let created: Node | undefined;
          // Everything the drop makes lands as one edit, so the node and the link to it undo together.
          const edits: SceneEdit[] = [];
          {
            // One cursor over the whole view, so the node a drop makes and the link to it land above it and
            // above each other rather than sharing a key.
            let z = topOfView(scene);
            const nextZ = () => (z = between(z, undefined));
            if (!target && isPointEndpoint(current.source)) {
              // A free-ended link that never reached a node ends free too.
              target = { point: current.to };
            } else if (!target && capabilities.create) {
              // Dropping a link drag on empty canvas creates a node there and links to it (canvas-editor
              // behaviour): a copy of the shape it left, without its text, else a rectangle. It is centred on
              // the release point (not the settled end, already snapped to the coarse grid) with its top-left
              // on the minor grid, as a palette drop lands.
              const drop = raw.kind === 'link' ? raw.to : current.to;
              const source = scene.nodes[endpointNode(current.source) ?? ''];
              const def = source ? nodeRegistry[source.type] : undefined;
              const size = source?.size ?? nominalSize(NOMINAL_SIZES.rect, cell);
              const props = {
                id: createId(source?.type ?? 'rect'),
                z,
                center: {
                  x: snap(drop.x - size.width / 2) + size.width / 2,
                  y: snap(drop.y - size.height / 2) + size.height / 2,
                },
                size,
              };
              const node =
                source && def
                  ? cloneShape(source, def.create(props), nodeDef(nodeRegistry, source)?.parts)
                  : createNode({ type: 'rect', ...props });
              edits.push(nodeEdit(node));
              created = node;
              target = { node: node.id };
            }
            if (target) {
              const link = createLink({
                type: current.type,
                id: createId(current.type),
                z: created ? nextZ() : z,
                source: current.source,
                target,
                // A link between ports that declare a direction is drawn with one.
                ends: isDirected(scene, nodeRegistry, current.source, target) ? { end: 'arrow' } : undefined,
              });
              edits.push(insertLink({ ...link, layer: activeLayer(scene, registry.get(atoms.layer)) }));
              draw.apply(edits.length === 1 ? edits[0] : chainEdits(edits));
              // What the user just made is what they act on next (style, delete): the link, and the node
              // the drop created with it.
              select(created ? [link.id, created.id] : [link.id]);
            }
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
        case 'freehand': {
          // Thinned to the points the line needs, so it has few enough vertices to edit; a press with no travel
          // leaves one point, which makes nothing.
          const tolerance = FREEHAND_TOLERANCE_PX / registry.get(atoms.camera).zoom;
          // Read from every sample, not the thinned ones: how near the stroke runs to a shape is in the samples, and
          // where the hand paused is in their times.
          const read =
            nodeRegistry[current.type]?.freehand === 'shape'
              ? readStroke(current.points, current.times, { minimum: 2 * minor, minor, major })
              : undefined;
          const landed = read?.kind === 'shape' ? landShape(read.shape) : read?.kind === 'path' && landPath(read.path);
          if (!landed) {
            landPoints(current.type, simplifyPath(current.points, tolerance), strokeCloses(current.points), true);
          }
          break;
        }
        case 'point': {
          draw.apply(updateElement(current.id, { points: current.points }));
          break;
        }
        case 'vertex': {
          // The frame refits to the vertices in the same update, so the edit is one undo step.
          const node = scene.nodes[current.id];
          // A node locked while its vertex was dragged keeps the shape it had.
          if (!node || node.locked || !hasVertices(node)) {
            break;
          }
          const before = polylineVertices(node);
          const moved =
            current.bend !== undefined ||
            before.length !== current.points.length ||
            current.points.some((point, index) => point.x !== before[index].x || point.y !== before[index].y);
          const values = moved ? refitPolyline(node, current.points, minor, current.bends) : undefined;
          if (values) {
            draw.apply(updateElement(current.id, values));
          }
          break;
        }
        case 'end': {
          // Dropped on a node it attaches there; dropped on empty canvas it becomes a free end at that point.
          const end = endDrop(current);
          if (end) {
            draw.apply(updateElement(current.id, { [current.end]: end }));
          }
          break;
        }
        case 'pan':
          break;
      }
    },
    [
      registry,
      atoms.drag,
      updateHover,
      toScene,
      atoms.selection,
      setDrag,
      scene,
      select,
      draw,
      capabilities.create,
      snap,
      settle,
      nodeRegistry,
      setTool,
      duplicate,
      createdNode,
      commitCreated,
      addNode,
      nodeEdit,
      minor,
      cell,
      snap,
      activate,
      rootRef,
      landPoints,
      landShape,
      landPath,
      atoms.camera,
    ],
  );

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
    onEndContextMenu,
    onVertexPointerDown,
    onVertexMidpointPointerDown,
    onBendPointerDown,
    deleteVertex,

    setDrag,
    toScene,
    removePoint,

    finishVertices,
    removeVertex,

    createdNode,
    commitCreated,

    menu,
    closeMenu,
    menuAnchorRef,
  };
};
