//
// Copyright 2026 DXOS.org
//

//
// Scene engine types (docs/DESIGN.md §4). Plain Effect schemas: no ECHO yet, so the same shapes wrap
// into an ECHO type later without change. A scene is one level of detail; cells live in its own
// coordinate space; a portal cell references another scene by id.
//

import * as Schema from 'effect/Schema';

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Point = Schema.Schema.Type<typeof Point>;

export const Size = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export type Size = Schema.Schema.Type<typeof Size>;

export const Bounds = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});
export type Bounds = Schema.Schema.Type<typeof Bounds>;

/** screen = (scene + {x, y}) * zoom */
export const Camera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type Camera = Schema.Schema.Type<typeof Camera>;

export type CellId = string;
export type SceneId = string;
export type PortId = string;

export const Side = Schema.Literals(['n', 'e', 's', 'w']);
export type Side = Schema.Schema.Type<typeof Side>;

/** An attachment point on a cell's frame: a side and a 0..1 offset along it. */
export type Port = { id: PortId; side: Side; offset: number };

const base = {
  id: Schema.String,
  /** Fractional z-order index (see `order.ts`). */
  z: Schema.String,
  locked: Schema.optional(Schema.Boolean),
};

const placed = {
  center: Point,
  size: Size,
};

export const RectCell = Schema.Struct({
  kind: Schema.Literal('rect'),
  ...base,
  ...placed,
  label: Schema.optional(Schema.String),
});
export type RectCell = Schema.Schema.Type<typeof RectCell>;

export const TextCell = Schema.Struct({
  kind: Schema.Literal('text'),
  ...base,
  ...placed,
  text: Schema.String,
});
export type TextCell = Schema.Schema.Type<typeof TextCell>;

/** Portal to the next depth: renders the referenced scene scaled into this cell's bounds. */
export const PortalCell = Schema.Struct({
  kind: Schema.Literal('scene'),
  ...base,
  ...placed,
  scene: Schema.String,
});
export type PortalCell = Schema.Schema.Type<typeof PortalCell>;

/** A link end; no `port` means automatic (the closest appropriate pair, recomputed on every projection). */
export const Endpoint = Schema.Struct({
  cell: Schema.String,
  port: Schema.optional(Schema.String),
});
export type Endpoint = Schema.Schema.Type<typeof Endpoint>;

export const LinkCell = Schema.Struct({
  kind: Schema.Literal('link'),
  ...base,
  source: Endpoint,
  target: Endpoint,
  route: Schema.optional(Schema.Literals(['curve', 'ortho'])),
});
export type LinkCell = Schema.Schema.Type<typeof LinkCell>;

export const Cell = Schema.Union([RectCell, TextCell, PortalCell, LinkCell]);
export type Cell = Schema.Schema.Type<typeof Cell>;
export type PlacedCell = RectCell | TextCell | PortalCell;
export type CellKind = Cell['kind'];

export const Scene = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
  cells: Schema.Record(Schema.String, Cell),
});
export type Scene = Schema.Schema.Type<typeof Scene>;

export const isPlaced = (cell: Cell): cell is PlacedCell => cell.kind !== 'link';
export const isLink = (cell: Cell): cell is LinkCell => cell.kind === 'link';

/**
 * What the surface asks of a projection (§3). The surface never writes coordinates itself: a
 * projection may apply, rewrite or reject each intent and then re-emits the positioned scene.
 */
export type Intent =
  | { kind: 'move'; ids: CellId[]; delta: Point }
  | { kind: 'resize'; id: CellId; bounds: Bounds }
  | { kind: 'link'; id: CellId; source: Endpoint; target: Endpoint }
  | { kind: 'create'; cell: Cell }
  | { kind: 'delete'; ids: CellId[] }
  | { kind: 'reorder'; id: CellId; z: string }
  /** Property edits (label, text, geometry); `id` and `kind` never change. */
  | { kind: 'update'; id: CellId; values: Partial<Cell> };

export type Capabilities = {
  move?: boolean;
  resize?: boolean;
  link?: boolean;
  create?: boolean;
  delete?: boolean;
  update?: boolean;
};

export type Tool = 'select' | 'hand' | 'rect' | 'text' | 'scene' | 'link';

/** Grid spacing and snap unit in scene px; fixtures and layout defaults are multiples of it. */
export const DEFAULT_GRID = 16;
