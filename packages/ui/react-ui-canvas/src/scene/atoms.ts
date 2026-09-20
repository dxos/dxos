//
// Copyright 2026 DXOS.org
//

//
// Per-view ephemeral state (§4): selection, hover, drag, camera and the scene path live in atoms
// owned by the view, never in the model, so two views of one scene stay independent.
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import { type Bounds, type Camera, type CellId, type Endpoint, type Point, type SceneId, type Tool } from './types.ts';

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type Drag =
  /** Screen-space pan; `last` is the previous pointer position. */
  | { kind: 'pan'; last: Point }
  /** Marquee in scene coordinates. */
  | { kind: 'marquee'; from: Point; to: Point; additive: boolean }
  /** Moving the selection; `delta` is the snapped scene-space offset applied transiently. */
  | { kind: 'move'; ids: CellId[]; origin: Point; delta: Point }
  /** Resizing one cell by a handle; `bounds` is the transient result. */
  | { kind: 'resize'; id: CellId; handle: Handle; start: Bounds; bounds: Bounds }
  /** Rubber band from a port; `target` is set while hovering a valid drop. */
  | { kind: 'link'; source: Endpoint; from: Point; to: Point; target?: Endpoint }
  /** Drawing a new cell with a tool. */
  | { kind: 'create'; tool: 'rect' | 'text' | 'scene'; from: Point; to: Point };

export type HistoryEntry = { path: SceneId[]; camera: Camera };

export type SceneViewAtoms = {
  camera: Atom.Writable<Camera>;
  path: Atom.Writable<SceneId[]>;
  selection: Atom.Writable<ReadonlySet<CellId>>;
  hover: Atom.Writable<CellId | undefined>;
  tool: Atom.Writable<Tool>;
  /** Grid shown and moves/resizes snapped to it. */
  snap: Atom.Writable<boolean>;
  drag: Atom.Writable<Drag | undefined>;
  history: Atom.Writable<{ entries: HistoryEntry[]; index: number }>;
};

/**
 * Fresh atoms for one view. Marked keepAlive so they survive React strict-mode remounts; the owner
 * decides their lifetime.
 */
export const createSceneViewAtoms = (root: SceneId): SceneViewAtoms => ({
  camera: Atom.keepAlive(Atom.make<Camera>({ x: 0, y: 0, zoom: 1 })),
  path: Atom.keepAlive(Atom.make<SceneId[]>([root])),
  selection: Atom.keepAlive(Atom.make<ReadonlySet<CellId>>(new Set<CellId>())),
  hover: Atom.keepAlive(Atom.make<CellId | undefined>(undefined)),
  tool: Atom.keepAlive(Atom.make<Tool>('select')),
  snap: Atom.keepAlive(Atom.make<boolean>(true)),
  drag: Atom.keepAlive(Atom.make<Drag | undefined>(undefined)),
  history: Atom.keepAlive(Atom.make<{ entries: HistoryEntry[]; index: number }>({ entries: [], index: -1 })),
});
