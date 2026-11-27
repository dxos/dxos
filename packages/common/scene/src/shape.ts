//
// Copyright 2026 DXOS.org
//

// The diagram's graphical primitives (rect, ellipse, line, curve, arc, text, arrow, portal) and their style
// vocabulary, in object-local units; shared by the diagram engines, the SVG renderer and the canvas's diagram
// elements (COMMON-CORE plan 0.1).

import * as Schema from 'effect/Schema';

import { Color } from './color.ts';
import { Align, Corners, Fill, Point, Stroke, VerticalAlign, Weight } from './vocabulary.ts';

export { Color } from './color.ts';
export { Align, Corners, Fill, Point, Stroke, VerticalAlign, Weight } from './vocabulary.ts';

/** How a box places what names it: on tracks, as CSS grid does, or by packing circles into its frame. */
export const Layout = Schema.Literals(['tracks', 'pack']);
export type Layout = Schema.Schema.Type<typeof Layout>;

/** Where a grid's tracks sit along one axis when they leave space over, as CSS's `*-content` properties say it. */
export const Place = Schema.Literals(['start', 'center', 'end']);
export type Place = Schema.Schema.Type<typeof Place>;

const styleFields = {
  color: Schema.optional(Color).annotate({ description: 'Stroke/text color.' }),
  fill: Schema.optional(Fill).annotate({ description: 'Interior fill of closed shapes.' }),
  /**
   * Unset is the host's own default, which is to draw an outline, so a shape that draws none has to say `none`:
   * without it a borderless label reads back as a bordered box.
   */
  stroke: Schema.optional(Stroke).annotate({
    description: 'Line or outline: none draws no outline; sketchy is hand-drawn.',
  }),
  weight: Schema.optional(Weight).annotate({ description: 'Stroke weight / text size.' }),
  align: Schema.optional(Align).annotate({ description: "Where the shape's text sits across it." }),
  valign: Schema.optional(VerticalAlign).annotate({ description: "Where the shape's text sits down it." }),
  /** Text size in scene units. `weight` names a size by role; this one states it. */
  fontSize: Schema.optional(Schema.Number).annotate({ description: 'Text size in scene units.' }),
};

/**
 * What a `grid` box places with, modelled on CSS grid. The rule is what is stored and what the text carries; the
 * children's coordinates are a cached projection of it, re-solved whenever the drawing is rendered — which is what
 * keeps a run evenly spaced when a member is added or the grid is resized.
 */
const gridFields = {
  /** Column tracks: a count (`3`), or a list (`"1fr auto 2fr"`) of shares, content sizes and fixed extents. */
  cols: Schema.optional(Schema.Union([Schema.Number, Schema.String])).annotate({ description: 'Column tracks.' }),
  /** Row tracks, in the same spelling. */
  rows: Schema.optional(Schema.Union([Schema.Number, Schema.String])).annotate({ description: 'Row tracks.' }),
  /** Space between two cells, in scene units. */
  gap: Schema.optional(Schema.Number).annotate({ description: 'Space between two cells.' }),
  /** Space between the grid's frame and its cells, in scene units. */
  padding: Schema.optional(Schema.Number).annotate({ description: "Space inside the grid's frame." }),
  /**
   * The size every implicit column takes, in the track spelling (CSS's `grid-auto-columns`). Unset is one share
   * each, so an axis that states no count fills the frame; `136` instead gives every cell that extent, which is
   * how a run of cards comes out one size whatever its neighbour holds.
   */
  autoCols: Schema.optional(Schema.Union([Schema.Number, Schema.String])).annotate({
    description: 'Size of each implicit column track.',
  }),
  /** The size every implicit row takes, in the same spelling. */
  autoRows: Schema.optional(Schema.Union([Schema.Number, Schema.String])).annotate({
    description: 'Size of each implicit row track.',
  }),
  /** Where the columns sit when they do not fill the frame (CSS's `justify-content`). */
  justifyContent: Schema.optional(Place).annotate({ description: 'Where the columns sit across the frame.' }),
  /** Where the rows sit when they do not fill the frame (CSS's `align-content`). */
  alignContent: Schema.optional(Place).annotate({ description: 'Where the rows sit down the frame.' }),
  /**
   * How the box places what names it: on tracks (the default) or by packing circles into its frame, where `seed`,
   * `rmin` and `rmax` are the packing's and `cols`/`rows` say nothing.
   */
  layout: Schema.optional(Layout).annotate({ description: 'How the box places its children.' }),
  /**
   * The seed a packing is laid out from; the same seed always gives the same field. Named apart from a kind's own
   * `seed`, which a box carrying a kind keeps in its `data`.
   */
  packSeed: Schema.optional(Schema.Number).annotate({ description: "A packing's seed." }),
  /** The smallest and largest a packed child may be, in scene units. */
  packMin: Schema.optional(Schema.Number).annotate({ description: 'Smallest packed child.' }),
  packMax: Schema.optional(Schema.Number).annotate({ description: 'Largest packed child.' }),
  /**
   * The grid that places this box. Its own `x`/`y` and size are then the grid's to decide; the size it states is
   * what an `auto` track measures, so a label can keep its own height while the body beside it takes the rest.
   */
  parent: Schema.optional(Schema.String).annotate({ description: 'The grid that places this box.' }),
  /**
   * The size the box keeps in the cell its grid gives it, centred there; an axis left out fills the cell. Stated
   * apart from `w` and `h`, which for a placed box are the grid's result and are written over each time it is
   * solved. In a packed grid the larger of the two is the diameter of the box's circle.
   */
  width: Schema.optional(Schema.Number).annotate({ description: 'Width the box keeps inside its grid cell.' }),
  height: Schema.optional(Schema.Number).annotate({ description: 'Height the box keeps inside its grid cell.' }),
};

const id = Schema.String.annotate({
  description: 'Stable element id, unique within the object (e.g. "left-eye"). Used to edit or delete the element.',
});

/** The closed-shape kinds {@link Box} covers. */
export const BoxKind = Schema.Literals(['rect', 'ellipse', 'diamond', 'triangle', 'grid']);
export type BoxKind = Schema.Schema.Type<typeof BoxKind>;

/** Closed shape drawn inside a local bounding box. */
export const Box = Schema.Struct({
  kind: BoxKind,
  id,
  x: Schema.Number.annotate({ description: 'Left edge (object-local units).' }),
  y: Schema.Number.annotate({ description: 'Top edge (object-local units).' }),
  w: Schema.Number,
  h: Schema.Number,
  rotation: Schema.optional(Schema.Number).annotate({ description: 'Clockwise rotation in degrees.' }),
  text: Schema.optional(Schema.String).annotate({ description: 'Centered label.' }),
  corners: Schema.optional(Corners).annotate({
    description: 'Rects only: round these corners (default all); backends without corner control ignore it.',
  }),
  /**
   * The contributed element kind this box really is (`card`, `plank`, a composite's kind), which the text writes as
   * `kind=`. The geometry stays on the box, so a host that does not know the component still draws a box; a host that
   * does draws the component. Without it a drawing that uses one cannot be written down: every one flattens to a rect
   * on the way through the DSL.
   */
  component: Schema.optional(Schema.String).annotate({ description: "A contributed element kind's name." }),
  /** The component's own fields, as its schema declares them. */
  data: Schema.optional(Schema.Record(Schema.String, Schema.Any)).annotate({
    description: "A contributed kind's own fields.",
  }),
  ...gridFields,
  ...styleFields,
});
export type Box = Schema.Schema.Type<typeof Box>;

/** Circle sugar; reads back as an ellipse. */
export const Circle = Schema.Struct({
  kind: Schema.Literal('circle'),
  id,
  cx: Schema.Number.annotate({ description: 'Center x (object-local units).' }),
  cy: Schema.Number.annotate({ description: 'Center y (object-local units).' }),
  r: Schema.Number,
  text: Schema.optional(Schema.String),
  ...styleFields,
});
export type Circle = Schema.Schema.Type<typeof Circle>;

/** Straight segment or open polyline through the given points. */
export const Polyline = Schema.Struct({
  kind: Schema.Literal('line'),
  id,
  points: Schema.Array(Point).annotate({ description: 'Two or more points (object-local units).' }),
  closed: Schema.optional(Schema.Boolean).annotate({ description: 'Close the path back to the first point.' }),
  guide: Schema.optional(Schema.Boolean).annotate({
    description:
      'A guide (lifeline, divider, outline) rather than a connector; layout checks do not count it as a route.',
  }),
  ...styleFields,
});
export type Polyline = Schema.Schema.Type<typeof Polyline>;

/** Smooth curve through the given points (spline). */
export const Curve = Schema.Struct({
  kind: Schema.Literal('curve'),
  id,
  points: Schema.Array(Point).annotate({ description: 'Control points the curve passes through.' }),
  ...styleFields,
});
export type Curve = Schema.Schema.Type<typeof Curve>;

/**
 * Circular arc sugar; reads back as a curve. Angles are degrees, measured clockwise from
 * the positive x-axis in screen coordinates (y grows downward): 0–180 is the lower half
 * (a smile), 180–360 the upper half (a frown).
 */
export const Arc = Schema.Struct({
  kind: Schema.Literal('arc'),
  id,
  cx: Schema.Number,
  cy: Schema.Number,
  r: Schema.Number,
  startAngle: Schema.Number,
  endAngle: Schema.Number,
  ...styleFields,
});
export type Arc = Schema.Schema.Type<typeof Arc>;

/** Free-standing text. */
export const Text = Schema.Struct({
  kind: Schema.Literal('text'),
  id,
  x: Schema.Number,
  y: Schema.Number,
  w: Schema.optional(Schema.Number).annotate({ description: 'Wrap width; omit for auto-size.' }),
  text: Schema.String,
  ...styleFields,
});
export type Text = Schema.Schema.Type<typeof Text>;

/** UML-style end markers: the head sits at the target, the tail at the source. */
/**
 * How a connector runs between its ends, as the canvas's link variants name it: `smart` (the default) leaves each
 * port along its normal and joins the two, `ortho` turns at right angles, `line` runs straight and `curve` bends.
 * `spline` is left out: its shape is its control points, which an arrow has no spelling for.
 */
export const Path = Schema.Literals(['smart', 'ortho', 'line', 'curve']);
export type Path = Schema.Schema.Type<typeof Path>;

export const ArrowHead = Schema.Literals(['arrow', 'triangle', 'crowsfoot', 'none']);
export type ArrowHead = Schema.Schema.Type<typeof ArrowHead>;
export const ArrowTail = Schema.Literals(['none', 'circle', 'arrow']);
export type ArrowTail = Schema.Schema.Type<typeof ArrowTail>;

/**
 * What a connector means, in UML and ER terms; renderers derive its end markers and dash from it.
 * The source end is the subtype (inheritance, implementation), the whole (composition), the owner
 * (aggregation), or the one side (one-to-many); the target end is the other.
 */
export const Relation = Schema.Literals([
  'association',
  'dependency',
  'inheritance',
  'implementation',
  'composition',
  'aggregation',
  'one-to-many',
  'many-to-many',
]);
export type Relation = Schema.Schema.Type<typeof Relation>;

/** A marker a renderer draws at a connector end. */
export type Marker = 'arrow' | 'open' | 'triangle' | 'crowsfoot' | 'one' | 'diamond' | 'diamond-filled' | 'circle';

/** The markers at a connector's source (`tail`) and target (`head`), and whether its line is dashed. */
export type RelationMarkers = { tail?: Marker; head?: Marker; dashed: boolean };

const RELATION_MARKERS: Record<Relation, RelationMarkers> = {
  'association': { head: 'arrow', dashed: false },
  'dependency': { head: 'open', dashed: true },
  'inheritance': { head: 'triangle', dashed: false },
  'implementation': { head: 'triangle', dashed: true },
  'composition': { tail: 'diamond-filled', dashed: false },
  'aggregation': { tail: 'diamond', dashed: false },
  'one-to-many': { tail: 'one', head: 'crowsfoot', dashed: false },
  'many-to-many': { tail: 'crowsfoot', head: 'crowsfoot', dashed: false },
};

/**
 * The markers an arrow draws: its relation's, unless `head` or `tail` says otherwise, which keeps
 * documents written before relations existed drawing as they did.
 */
export const markersOf = (arrow: Pick<Arrow, 'relation' | 'head' | 'tail' | 'stroke'>): RelationMarkers => {
  const derived = arrow.relation ? RELATION_MARKERS[arrow.relation] : { head: 'arrow' as const, dashed: false };
  const head = arrow.head === undefined ? derived.head : arrow.head === 'none' ? undefined : arrow.head;
  const tail = arrow.tail === undefined ? derived.tail : arrow.tail === 'none' ? undefined : arrow.tail;
  return {
    ...(tail ? { tail } : {}),
    ...(head ? { head } : {}),
    dashed: arrow.stroke === undefined ? derived.dashed : arrow.stroke === 'dashed',
  };
};

/**
 * Connector. Endpoints are element refs — `"<elementId>"` within the same object or
 * `"<objectId>/<elementId>"` across objects, either with an optional `#<port>` naming an
 * attachment point on the element — or explicit local points. Bound endpoints track their
 * target when it moves; without a port the renderer picks the attachment point.
 */
export const Arrow = Schema.Struct({
  kind: Schema.Literal('arrow'),
  id,
  from: Schema.optional(Schema.String).annotate({ description: 'Source element ref, optionally `#port`.' }),
  to: Schema.optional(Schema.String).annotate({ description: 'Target element ref, optionally `#port`.' }),
  start: Schema.optional(Point).annotate({ description: 'Explicit start (used when `from` is omitted).' }),
  end: Schema.optional(Point).annotate({ description: 'Explicit end (used when `to` is omitted).' }),
  text: Schema.optional(Schema.String).annotate({ description: 'Label at the arrow midpoint.' }),
  head: Schema.optional(ArrowHead).annotate({
    description: 'Marker at the target end (default arrow): triangle for inheritance, crowsfoot for has-many.',
  }),
  tail: Schema.optional(ArrowTail).annotate({
    description: 'Marker at the source end (default none): circle for containment, arrow for a two-way connector.',
  }),
  /**
   * The whole route the connector runs, in scene units: where it leaves its source, every bend, and where it meets
   * its target. The ends are written down too, rather than left to be re-derived, because they are attachment
   * points on each shape's outline — re-deriving them is the canvas routing the connector itself, which is what a
   * stored route exists to override. Without this a connector routed by hand or by a layout lost its bends the
   * moment the drawing was written down and snapped back to a straight run.
   */
  route: Schema.optional(Schema.Array(Point)).annotate({ description: "The connector's route, ends included." }),
  path: Schema.optional(Path).annotate({
    description: 'How the connector runs between its ends (default `smart`).',
  }),
  relation: Schema.optional(Relation).annotate({
    description:
      'What the connector means; sets its markers: inheritance and implementation (hollow triangle at the target), composition and aggregation (filled or hollow diamond at the source, the whole), one-to-many (bar at the source, crow’s foot at the target), many-to-many, dependency (dashed, open arrow), association.',
  }),
  ...styleFields,
});
export type Arrow = Schema.Schema.Type<typeof Arrow>;

/** A parsed endpoint ref; `object` is absent for a ref within the same object. */
export type ElementRef = {
  object?: string;
  element: string;
  port?: string;
};

/** Parse `"[object/]element[#port]"`; element ids may not contain `/` or `#`. */
export const parseRef = (ref: string): ElementRef => {
  const hash = ref.indexOf('#');
  const target = hash === -1 ? ref : ref.slice(0, hash);
  const port = hash === -1 ? undefined : ref.slice(hash + 1);
  const slash = target.indexOf('/');
  return {
    ...(slash === -1 ? {} : { object: target.slice(0, slash) }),
    element: slash === -1 ? target : target.slice(slash + 1),
    ...(port ? { port } : {}),
  };
};

/** Inverse of {@link parseRef}. */
export const formatRef = ({ object, element, port }: ElementRef): string =>
  `${object === undefined ? '' : `${object}/`}${element}${port === undefined ? '' : `#${port}`}`;

/**
 * Canonical `object/element` handle of a ref, resolving a bare element id against the owning
 * object and dropping the port, so renderers without ports bind to the element itself.
 */
export const resolveRef = (ref: string, objectId: string): string => {
  const { object = objectId, element } = parseRef(ref);
  return `${object}/${element}`;
};

/**
 * Window onto another drawing: the referenced scene is rendered inside the box as a nested level
 * of detail. Renderers without nesting ignore it.
 */
export const Portal = Schema.Struct({
  kind: Schema.Literal('portal'),
  id,
  x: Schema.Number.annotate({ description: 'Left edge (object-local units).' }),
  y: Schema.Number.annotate({ description: 'Top edge (object-local units).' }),
  w: Schema.Number,
  h: Schema.Number,
  ref: Schema.String.annotate({ description: 'The drawing shown inside the box: an ECHO object reference (DXN).' }),
  text: Schema.optional(Schema.String).annotate({ description: 'Title shown on the frame.' }),
  ...styleFields,
});
export type Portal = Schema.Schema.Type<typeof Portal>;

export const Element = Schema.Union([Box, Circle, Polyline, Curve, Arc, Text, Arrow, Portal]);
export type Element = Schema.Schema.Type<typeof Element>;
