//
// Copyright 2026 DXOS.org
//

//
// Per-view ephemeral state (§4): selection, hover, drag, camera and the scene path live in atoms
// owned by the view, never in the model, so two views of one scene stay independent.
//

import * as Atom from 'effect/reactivity/Atom';

import { type Clock, createClock } from '@dxos/animation';
import {
  type Bounds,
  type ElementId,
  type Endpoint,
  type LayerId,
  type LinkId,
  type LinkType,
  type NodeId,
  type NodeType,
  type Point,
  type Side,
  type ViewId,
} from '@dxos/scene';

import { type Camera, type Tool } from '../model/index.ts';
import { type Clipboard, type PartKey } from '../utils/index.ts';

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type LinkEnd = 'source' | 'target';

/**
 * The pointer machine's state. A node gesture (move, resize, create, a spline point) shows its geometry
 * snapped as it goes; a link band follows the pointer exactly and snaps once, as it lands.
 */
export type Drag =
  /** Screen-space pan; `last` is the previous pointer position. */
  | { kind: 'pan'; last: Point }
  /** Marquee in scene coordinates; shift adds the hits to the selection, alt subtracts them. */
  | { kind: 'marquee'; from: Point; to: Point; mode: 'replace' | 'add' | 'subtract' }
  /**
   * Moving the selection; `anchor` is the pressed node's top-left, which is what snaps to the grid,
   * and `delta` the resulting scene-space offset applied transiently to every selected node. With
   * `copy` (⌘ held) the originals stay and copies land at `delta` instead. `raw` is the pointer's own offset, which
   * the nodes follow while the drag is in flight; `delta` is where they land.
   */
  | { kind: 'move'; ids: NodeId[]; origin: Point; anchor: Point; delta: Point; raw?: Point; copy?: boolean }
  /** Resizing one node by a handle; `bounds` is the transient result. */
  | { kind: 'resize'; id: NodeId; handle: Handle; start: Bounds; bounds: Bounds }
  /**
   * Rubber band from a port, or from a free point under a link tool; `target` is set while hovering a
   * valid drop, and the link is then previewed as created.
   */
  | { kind: 'link'; type: LinkType; source: Endpoint; from: Point; fromSide: Side; to: Point; target?: Endpoint }
  /**
   * Drawing a new node with a tool. `dropped` marks one dragged in from the palette or a host's
   * draggable, which previews as its frame alone: the pointer already carries the drag's own preview.
   */
  | { kind: 'create'; type: NodeType; from: Point; to: Point; dropped?: boolean }
  /**
   * Drawing a node vertex by vertex (`NodeDef.createFromPoints`): `points` are those placed, in scene coordinates, and
   * `to` the pointer, where the next segment runs. It outlasts each press, ending when the line is finished or dropped.
   */
  | { kind: 'vertices'; type: NodeType; points: Point[]; to: Point }
  /** Moving one vertex of a node in vertex edit mode; `points` are all its vertices, in scene coordinates. */
  | { kind: 'vertex'; id: NodeId; index: number; points: Point[] }
  /** Moving one control point of a spline; `points` is the transient list. */
  | { kind: 'point'; id: LinkId; index: number; points: Point[] }
  /** Re-attaching one end of a link; `fixed` is the other end's resolved port for the rubber band. */
  | { kind: 'end'; id: LinkId; end: LinkEnd; fixed: Point; fixedSide: Side; to: Point; target?: Endpoint };

/**
 * Whether a move has left where it was pressed: until it does, a press on a selected node is a click, and the
 * selection keeps its outline and handles rather than flickering off and on.
 */
export const isMoving = (drag: Drag | undefined): boolean =>
  drag?.kind === 'move' && drag.raw !== undefined && (drag.raw.x !== 0 || drag.raw.y !== 0);

export type HistoryEntry = { path: ViewId[]; camera: Camera };

/**
 * A composite open on its own (ANIMATION.md §4.3): the view shows its definition scene on a plain background, and
 * `back` is the scene path and camera to return to.
 */
export type Isolation = { composite: ViewId; back: HistoryEntry };

export type ControlPointRef = { link: LinkId; index: number };

/**
 * The node in edit mode, one at a time (`NodeDef.editor`): a text part edited in place (`parts.ts`), or its vertices
 * shown as points to drag, `vertex` the one last pressed. Enter, Escape or a press outside the node leaves it.
 */
export type Editing = { id: NodeId; kind: 'label'; part: PartKey } | { id: NodeId; kind: 'vertices'; vertex?: number };

export type CanvasAtoms = {
  camera: Atom.Writable<Camera>;
  path: Atom.Writable<ViewId[]>;
  selection: Atom.Writable<ReadonlySet<ElementId>>;
  hover: Atom.Writable<NodeId | undefined>;
  /** The link under the pointer, which shows its end handles as a selected one does. */
  linkHover: Atom.Writable<LinkId | undefined>;
  /** The layer new shapes and links go on; unset (or a layer the scene does not have), the top one. */
  layer: Atom.Writable<LayerId | undefined>;
  /** The selected control point of a selected spline, if any. */
  point: Atom.Writable<ControlPointRef | undefined>;
  tool: Atom.Writable<Tool>;
  /** The link type a port drag creates under the select tool: smart until a link tool is picked, then the last one. */
  linkType: Atom.Writable<LinkType>;
  /** Grid shown and moves/resizes snapped to it. */
  snap: Atom.Writable<boolean>;
  /** Guides shown: on a lattice, its cells. */
  guides: Atom.Writable<boolean>;
  /** The axes through the origin drawn. */
  axes: Atom.Writable<boolean>;
  drag: Atom.Writable<Drag | undefined>;
  history: Atom.Writable<{ entries: HistoryEntry[]; index: number }>;
  /** The last cut or copied fragment (`clipboard.ts`). */
  clipboard: Atom.Writable<Clipboard | undefined>;
  editing: Atom.Writable<Editing | undefined>;
  /**
   * The node whose embedded content takes input (an editor in a frame), entered by clicking the node; any other
   * node's embedded content is inert, so a press anywhere on it selects and moves it.
   */
  active: Atom.Writable<NodeId | undefined>;
  /** Frames show their id, type and geometry. */
  debug: Atom.Writable<boolean>;
  /** The time the view shows and whether it plays (ANIMATION.md §5.1): the host samples the document at it. */
  clock: Clock;
  /** The composite open in isolation, if any. */
  isolation: Atom.Writable<Isolation | undefined>;
};

/**
 * Fresh atoms for one view. Marked keepAlive so they survive React strict-mode remounts; the owner
 * decides their lifetime.
 */
export const createCanvasAtoms = (root: ViewId): CanvasAtoms => ({
  camera: Atom.keepAlive(Atom.make<Camera>({ x: 0, y: 0, zoom: 1 })),
  path: Atom.keepAlive(Atom.make<ViewId[]>([root])),
  selection: Atom.keepAlive(Atom.make<ReadonlySet<ElementId>>(new Set<ElementId>())),
  hover: Atom.keepAlive(Atom.make<NodeId | undefined>(undefined)),
  linkHover: Atom.keepAlive(Atom.make<LinkId | undefined>(undefined)),
  layer: Atom.keepAlive(Atom.make<LayerId | undefined>(undefined)),
  point: Atom.keepAlive(Atom.make<ControlPointRef | undefined>(undefined)),
  tool: Atom.keepAlive(Atom.make<Tool>({ kind: 'select' })),
  linkType: Atom.keepAlive(Atom.make<LinkType>('smart')),
  snap: Atom.keepAlive(Atom.make<boolean>(true)),
  guides: Atom.keepAlive(Atom.make<boolean>(true)),
  axes: Atom.keepAlive(Atom.make<boolean>(false)),
  drag: Atom.keepAlive(Atom.make<Drag | undefined>(undefined)),
  history: Atom.keepAlive(Atom.make<{ entries: HistoryEntry[]; index: number }>({ entries: [], index: -1 })),
  clipboard: Atom.keepAlive(Atom.make<Clipboard | undefined>(undefined)),
  editing: Atom.keepAlive(Atom.make<Editing | undefined>(undefined)),
  active: Atom.keepAlive(Atom.make<NodeId | undefined>(undefined)),
  debug: Atom.keepAlive(Atom.make<boolean>(false)),
  clock: createClock(),
  isolation: Atom.keepAlive(Atom.make<Isolation | undefined>(undefined)),
});
