//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * The Archify architecture intermediate representation (schema version 1), transcribed from
 * `archify/schemas/{common,architecture}.schema.json` (https://github.com/tt-a1i/archify).
 *
 * Everything a diagram needs is in here: the agent writes this and nothing else, and the renderer
 * derives geometry from it deterministically — the same IR always produces the same SVG.
 */

/** Ids are referenced from connections, boundaries and views, so they must be stable slugs. */
export const Id = Schema.String.check(Schema.isPattern(/^[a-zA-Z][a-zA-Z0-9_-]*$/));

export const Point = Schema.Tuple([Schema.Number, Schema.Number]);
export type Point = Schema.Schema.Type<typeof Point>;

export const Size = Schema.Tuple([Schema.Number, Schema.Number]);

export const Side = Schema.Literals(['left', 'right', 'top', 'bottom']);
export type Side = Schema.Schema.Type<typeof Side>;

/** The seven semantic roles Archify gives a node; each owns a fill/stroke pair in the palette. */
export const ComponentType = Schema.Literals([
  'frontend',
  'backend',
  'database',
  'cloud',
  'security',
  'messagebus',
  'external',
]);
export type ComponentType = Schema.Schema.Type<typeof ComponentType>;

/** Relationship vocabulary: the only four ways a connection may be drawn. */
export const Variant = Schema.Literals(['default', 'emphasis', 'security', 'dashed']);
export type Variant = Schema.Schema.Type<typeof Variant>;

export const Route = Schema.Literals(['auto', 'straight', 'orthogonal-h', 'orthogonal-v']);
export type Route = Schema.Schema.Type<typeof Route>;

export const DotColor = Schema.Literals(['cyan', 'emerald', 'violet', 'amber', 'rose', 'orange', 'slate']);
export type DotColor = Schema.Schema.Type<typeof DotColor>;

export const Component = Schema.Struct({
  id: Id,
  type: ComponentType,
  label: Schema.String.check(Schema.isNonEmpty()),
  sublabel: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String).annotate({ description: 'Small stamp above the box, e.g. a port or protocol.' }),
  row: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
  col: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
  pos: Schema.optional(Point).annotate({ description: 'Absolute [x, y] in diagram units; wins over row/col.' }),
  size: Schema.optional(Size).annotate({ description: 'Box [width, height]; defaults to [120, 60].' }),
});
export type Component = Schema.Schema.Type<typeof Component>;

export const Boundary = Schema.Struct({
  kind: Schema.Literals(['region', 'security-group']),
  label: Schema.String.check(Schema.isNonEmpty()),
  wraps: Schema.Array(Id).check(Schema.isMinLength(1)),
  pad: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))),
});
export type Boundary = Schema.Schema.Type<typeof Boundary>;

export const Connection = Schema.Struct({
  id: Schema.optional(Id),
  from: Id,
  to: Id,
  label: Schema.optional(Schema.String),
  variant: Schema.optional(Variant),
  fromSide: Schema.optional(Side),
  toSide: Schema.optional(Side),
  route: Schema.optional(Route),
  via: Schema.optional(Schema.Array(Point)).annotate({ description: 'Explicit waypoints between the endpoints.' }),
  labelAt: Schema.optional(Point),
  labelDx: Schema.optional(Schema.Number),
  labelDy: Schema.optional(Schema.Number),
  labelSegment: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
  width: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(0.5))),
});
export type Connection = Schema.Schema.Type<typeof Connection>;

export const Card = Schema.Struct({
  dot: DotColor,
  title: Schema.String.check(Schema.isNonEmpty()),
  items: Schema.Array(Schema.String),
});
export type Card = Schema.Schema.Type<typeof Card>;

/** A named subset of the diagram the reader can step through; at most five, as upstream. */
export const View = Schema.Struct({
  id: Id,
  label: Schema.String.check(Schema.isNonEmpty(), Schema.isMaxLength(48)),
  focus: Schema.Array(Id).check(Schema.isMinLength(1)),
  note: Schema.optional(Schema.String.check(Schema.isMaxLength(140))),
});
export type View = Schema.Schema.Type<typeof View>;

export const Legend = Schema.Struct({
  mode: Schema.optional(Schema.Literals(['auto', 'all', 'hidden'])),
});
export type Legend = Schema.Schema.Type<typeof Legend>;

export const Meta = Schema.Struct({
  title: Schema.String.check(Schema.isNonEmpty()),
  subtitle: Schema.optional(Schema.String),
  views: Schema.optional(Schema.Array(View).check(Schema.isMaxLength(5))),
  legend: Schema.optional(Legend),
  viewBox: Schema.optional(Size).annotate({ description: 'Overrides the measured canvas size.' }),
});
export type Meta = Schema.Schema.Type<typeof Meta>;

export const Layout = Schema.Struct({
  mode: Schema.Literal('grid'),
  origin: Schema.optional(Point),
  cols: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 12 }))),
  gapX: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))),
  gapY: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))),
  cellW: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(40))),
  cellH: Schema.optional(Schema.Number.check(Schema.isGreaterThanOrEqualTo(24))),
});
export type Layout = Schema.Schema.Type<typeof Layout>;

/** The whole diagram source. `diagram_type`/`schema_version` keep Archify's snake case. */
export const Architecture = Schema.Struct({
  schema_version: Schema.Literal(1),
  diagram_type: Schema.Literal('architecture'),
  meta: Meta,
  layout: Schema.optional(Layout),
  components: Schema.Array(Component).check(Schema.isMinLength(1)),
  boundaries: Schema.optional(Schema.Array(Boundary)),
  connections: Schema.optional(Schema.Array(Connection)),
  cards: Schema.optional(Schema.Array(Card)),
});
export type Architecture = Schema.Schema.Type<typeof Architecture>;

/** A diagram that renders and validates on day one, so a new object is never a blank canvas. */
export const emptyArchitecture = (title: string): Architecture => ({
  schema_version: 1,
  diagram_type: 'architecture',
  meta: { title },
  components: [{ id: 'placeholder', type: 'backend', label: title, pos: [40, 80], size: [160, 64] }],
});
