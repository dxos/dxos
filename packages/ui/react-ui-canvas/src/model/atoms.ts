//
// Copyright 2026 DXOS.org
//

//
// Per-view ephemeral state (§4): selection, hover, drag, camera and the scene path live in atoms
// owned by the view, never in the model, so two views of one scene stay independent.
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { type Clipboard } from '../utils/clipboard.ts';
import { type PartKey } from '../utils/parts.ts';
import { type UndoState, emptyUndo } from '../utils/undo.ts';
import {
  type Bounds,
  type Camera,
  type ElementId,
  type Endpoint,
  type LinkId,
  type LinkType,
  type NodeId,
  type NodeType,
  type Point,
  type SceneId,
  type Side,
  type Tool,
} from './types.ts';

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

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
   * and `delta` the resulting scene-space offset applied transiently to every selected node.
   */
  | { kind: 'move'; ids: NodeId[]; origin: Point; anchor: Point; delta: Point }
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
  /** Moving one control point of a spline; `points` is the transient list. */
  | { kind: 'point'; id: LinkId; index: number; points: Point[] }
  /** Re-attaching one end of a link; `fixed` is the other end's resolved port for the rubber band. */
  | { kind: 'end'; id: LinkId; end: 'source' | 'target'; fixed: Point; fixedSide: Side; to: Point; target?: Endpoint };

export type HistoryEntry = { path: SceneId[]; camera: Camera };

export type ControlPointRef = { link: LinkId; index: number };

/** The text part being edited in place (`parts.ts`). */
export type EditingPart = { id: NodeId; part: PartKey };

export type SceneViewAtoms = {
  camera: Atom.Writable<Camera>;
  path: Atom.Writable<SceneId[]>;
  selection: Atom.Writable<ReadonlySet<ElementId>>;
  hover: Atom.Writable<NodeId | undefined>;
  /** The selected control point of a selected spline, if any. */
  point: Atom.Writable<ControlPointRef | undefined>;
  tool: Atom.Writable<Tool>;
  /** The link type a port drag creates under the select tool (the last link tool picked). */
  linkType: Atom.Writable<LinkType>;
  /** Grid shown and moves/resizes snapped to it. */
  snap: Atom.Writable<boolean>;
  drag: Atom.Writable<Drag | undefined>;
  history: Atom.Writable<{ entries: HistoryEntry[]; index: number }>;
  /** Projection snapshots for undo and redo (`undo.ts`). */
  undo: Atom.Writable<UndoState>;
  /** The last cut or copied fragment (`clipboard.ts`). */
  clipboard: Atom.Writable<Clipboard | undefined>;
  editing: Atom.Writable<EditingPart | undefined>;
  /** Frames show their id, type and geometry. */
  debug: Atom.Writable<boolean>;
};

/**
 * Fresh atoms for one view. Marked keepAlive so they survive React strict-mode remounts; the owner
 * decides their lifetime.
 */
export const createSceneViewAtoms = (root: SceneId): SceneViewAtoms => ({
  camera: Atom.keepAlive(Atom.make<Camera>({ x: 0, y: 0, zoom: 1 })),
  path: Atom.keepAlive(Atom.make<SceneId[]>([root])),
  selection: Atom.keepAlive(Atom.make<ReadonlySet<ElementId>>(new Set<ElementId>())),
  hover: Atom.keepAlive(Atom.make<NodeId | undefined>(undefined)),
  point: Atom.keepAlive(Atom.make<ControlPointRef | undefined>(undefined)),
  tool: Atom.keepAlive(Atom.make<Tool>({ kind: 'select' })),
  linkType: Atom.keepAlive(Atom.make<LinkType>('curve')),
  snap: Atom.keepAlive(Atom.make<boolean>(true)),
  drag: Atom.keepAlive(Atom.make<Drag | undefined>(undefined)),
  history: Atom.keepAlive(Atom.make<{ entries: HistoryEntry[]; index: number }>({ entries: [], index: -1 })),
  undo: Atom.keepAlive(Atom.make<UndoState>(emptyUndo())),
  clipboard: Atom.keepAlive(Atom.make<Clipboard | undefined>(undefined)),
  editing: Atom.keepAlive(Atom.make<EditingPart | undefined>(undefined)),
  debug: Atom.keepAlive(Atom.make<boolean>(false)),
});
