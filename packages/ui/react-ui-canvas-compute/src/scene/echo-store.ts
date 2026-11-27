//
// Copyright 2026 DXOS.org
//

//
// A `CanvasBoard` as a 2D scene layout (COMMON-CORE.md decision 10): the board keeps its stored graph (`layout.nodes`
// are shapes, `layout.edges` connections), so boards the old editor wrote open unchanged, and the shared editor reads
// and edits it as a `LayoutRecord2D` through `LayoutIntent`s. A shape is the element itself but for its z-order (array
// order in the board, a fractional key on the element), and a connection is a link but for its ends (a connection's
// `input` / `output` property names, an endpoint's anchor-id port). A compute shape's own fields (its compute `node`, a
// value) are under the shape's `data` and the element's alike, as a plugin kind's are (decisions 13 and 21). A board
// stored in an earlier form (a shape's `type`, its `guide` / `style` / `class`, a note's `text`, its kind's fields
// beside its own, a connection's `type`) reads the same, and its next write stores the current one.
//

import * as Equal from 'effect/Equal';
import * as Schema from 'effect/Schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { type VersionedSource, initialKeys, readPath, sortByZ, writePath } from '@dxos/react-ui-canvas/headless';
import {
  DEFAULT_LINK_PATH,
  type LayoutIntent,
  LINK_KIND,
  LINK_PATHS,
  Scene,
  Style2D,
  applyIntent,
  upgradeNode,
} from '@dxos/scene';

import { computeKinds } from '../registry.ts';
import { createAnchorId, parseAnchorId } from '../shapes/defs.ts';
import { type CanvasBoard } from '../types/index.ts';
import { type ComputeProjection } from './projection.ts';

/** A stored shape: the graph node's id and whatever fields its editor wrote. */
export type BoardShape = { id: string; [field: string]: unknown };

/** A stored connection between two shapes. */
export type BoardConnection = { id: string; source: string; target: string; [field: string]: unknown };

/** A board's stored graph, live (ECHO) or plain. */
export type BoardLayout = { nodes: BoardShape[]; edges: BoardConnection[] };

/** An element of a 2D layout, with any fields its kind adds. */
export type BoardElement = Scene.LayoutRecord2D['elements'][string];

const isStyle = Schema.is(Style2D);
const isLayoutRecord = Schema.is(Scene.LayoutRecord2D);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The id of the compute node an element or a stored shape stands for, which it keeps under its `data`. */
export const computeNodeId = (element: { readonly data?: unknown }): string | undefined =>
  isRecord(element.data) ? text(element.data.node) : undefined;

//
// Read
//

/**
 * The element a shape stands for: the shape itself, its kind's own fields under `data`. A shape stored in an earlier
 * form reads in the current words, a field `data` also holds giving way to it and a `guide` of its own joining its
 * look.
 */
export const elementFromShape = (shape: BoardShape, z: string): BoardElement => {
  const { guide, z: _z, ...stored } = shape;
  const { id: _id, kind: named, overrides, ...own } = upgradeNode(stored);
  const kind = text(named);
  const look = { ...(typeof guide === 'boolean' ? { guide } : {}), ...(isStyle(overrides) ? overrides : {}) };
  return {
    ...computeKinds.normalize({ ...own, ...(kind !== undefined ? { kind } : {}) }),
    id: shape.id,
    z,
    ...(Object.keys(look).length > 0 ? { overrides: look } : {}),
  };
};

/**
 * The link a connection stands for. Both ends are node ends, the editor having no free endpoints, and the property
 * names it stores become the anchor ids the compute node definitions draw ports for.
 */
const elementFromEdge = (edge: BoardConnection, z: string): BoardElement => {
  // A connection stored in an earlier form names its path as its `type`.
  const stated = edge.path ?? edge.type;
  return {
    id: edge.id,
    kind: LINK_KIND,
    z,
    source: { node: edge.source, port: createAnchorId('output', text(edge.output) ?? DEFAULT_OUTPUT) },
    target: { node: edge.target, port: createAnchorId('input', text(edge.input) ?? DEFAULT_INPUT) },
    path: LINK_PATHS.find((candidate) => candidate === stated) ?? DEFAULT_LINK_PATH,
    head: 'arrow',
  };
};

/**
 * The 2D layout a board's graph stands for. `z` comes from array order, shapes below links, so the first read of a
 * board reproduces the stacking the editor painted.
 */
export const boardLayout = (
  id: string,
  layout: Partial<BoardLayout> | undefined,
  name?: string,
): Scene.LayoutRecord2D => {
  const shapes = layout?.nodes ?? [];
  const edges = layout?.edges ?? [];
  const keys = initialKeys(shapes.length + edges.length);
  const elements: Record<string, BoardElement> = {};
  shapes.forEach((shape, index) => {
    elements[shape.id] = elementFromShape(shape, keys[index]);
  });
  edges.forEach((edge, index) => {
    elements[edge.id] = elementFromEdge(edge, keys[shapes.length + index]);
  });
  return { id, dim: '2d', ...(name ? { name } : {}), elements };
};

//
// Write
//

/** The shape an element is stored as: the element itself, its place in the paint order left to the array's. */
export const shapeFromElement = (element: BoardElement): BoardShape => {
  const { z: _z, ...shape } = element;
  return shape;
};

/** The connection a link is stored as; the default path is written only where the stored connection names one. */
const edgeFromElement = (
  { id, source, target, path = DEFAULT_LINK_PATH }: BoardElement,
  stored?: BoardConnection,
): BoardConnection => ({
  id,
  ...(path !== DEFAULT_LINK_PATH || stored?.path !== undefined || stored?.type !== undefined ? { path } : {}),
  source: source?.node ?? '',
  target: target?.node ?? '',
  output: parseAnchorId(source?.port ?? '')[1] || DEFAULT_OUTPUT,
  input: parseAnchorId(target?.port ?? '')[1] || DEFAULT_INPUT,
});

const isLink = (element: BoardElement): boolean => element.kind === LINK_KIND;

/**
 * The layout written into a board's graph in place: each shape and connection updated, added or removed on its own,
 * and the arrays left in z order. A wholesale rebuild would be one Automerge delta per write covering the whole board.
 */
export const writeBoardLayout = (layout: BoardLayout, record: Scene.LayoutRecord2D): void => {
  const ordered = sortByZ(Object.values(record.elements).map((element) => ({ ...element, z: element.z ?? '' })));
  const stored = new Map(layout.edges.map((edge) => [edge.id, edge]));
  applyElements(layout.nodes, ordered.filter((element) => !isLink(element)).map(shapeFromElement));
  applyElements(
    layout.edges,
    ordered.filter(isLink).map((element) => edgeFromElement(element, stored.get(element.id))),
  );
};

/** One array reconciled against the elements it should hold, in that order. */
const applyElements = <T extends { id: string; [field: string]: unknown }>(current: T[], next: readonly T[]): void => {
  const wanted = new Map(next.map((element) => [element.id, element]));
  for (let index = current.length - 1; index >= 0; index--) {
    const update = wanted.get(current[index].id);
    if (update) {
      assignFields(current[index], update);
    } else {
      current.splice(index, 1);
    }
  }
  const present = new Set(current.map(({ id }) => id));
  for (const element of next) {
    if (!present.has(element.id)) {
      current.push(element);
    }
  }
  reorder(current, next);
};

/** The array put in `next`'s order, moving only the elements that are out of place. */
const reorder = <T extends { id: string }>(current: T[], next: readonly T[]): void => {
  const order = new Map(next.map((element, index) => [element.id, index]));
  for (let index = 1; index < current.length; index++) {
    const element = current[index];
    const rank = order.get(element.id) ?? 0;
    let target = index;
    while (target > 0 && (order.get(current[target - 1].id) ?? 0) > rank) {
      target--;
    }
    if (target !== index) {
      current.splice(index, 1);
      current.splice(target, 0, element);
    }
  }
};

/** Fields written one by one, so an unchanged field produces no Automerge change. */
const assignFields = (element: Record<string, unknown>, next: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(next)) {
    // Structural, so a geometry object rebuilt with the same numbers writes nothing.
    if (key !== 'id' && !Equal.equals(element[key], value)) {
      element[key] = value;
    }
  }
  for (const key of Object.keys(element)) {
    if (key !== 'id' && !(key in next)) {
      delete element[key];
    }
  }
};

//
// Store
//

/** The layout id a board's graph takes; a board holds one layout, so it is the board's id. */
export const boardLayoutId = (board: CanvasBoard.CanvasBoard): string => board.id;

/** A board as a scene document: one 2D scene over its one layout, with no model. */
export const boardDocument = (layout: Scene.LayoutRecord2D): Scene.SceneDocument => ({
  scenes: [{ id: layout.id, dim: '2d', layout: layout.id, camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [layout],
  models: [],
});

export type BoardStore = {
  /** The id of the board's layout (and of its one scene). */
  readonly layout: string;
  /** The board's graph as it is stored now. */
  read: () => Scene.LayoutRecord2D;
  /** Writes an edit to the board, mirrored into the compute graph. */
  write: (intent: LayoutIntent) => void;
  /** The board's layout under its id, for the editor's field-level undo. */
  source: VersionedSource;
};

export type BoardStoreOptions = {
  /** Keeps the compute graph in step with every write; without it the board is a plain diagram. */
  projection?: ComputeProjection;
};

/**
 * The shared editor's store over a board: reads take a snapshot of the stored graph as a layout, intents are applied to
 * it (through the compute projection) and written back with `Obj.update`, and undo patches the layout's fields.
 */
export const createBoardStore = (
  board: CanvasBoard.CanvasBoard,
  { projection }: BoardStoreOptions = {},
): BoardStore => {
  const id = boardLayoutId(board);
  const read = () => {
    const snapshot = Obj.getSnapshot(board);
    return boardLayout(id, snapshot.layout, snapshot.name);
  };
  const store = (record: Scene.LayoutRecord2D) => Obj.update(board, (board) => writeBoardLayout(board.layout, record));
  const heads = () => ({ [id]: read() });
  return {
    layout: id,
    read,
    write: (intent) => {
      const before = read();
      const after = projection ? projection.apply(before, intent) : applyIntent(before, intent);
      after !== before && store(after);
    },
    source: {
      heads,
      read: (path, at) => readPath(at ?? heads(), path),
      write: (writes) => {
        const before = read();
        const next = readPath(
          writes.reduce<unknown>((value, { path, value: entry }) => writePath(value, path, entry), { [id]: before }),
          [id],
        );
        if (isLayoutRecord(next)) {
          projection?.restored(before, next);
          store(next);
        }
      },
    },
  };
};
