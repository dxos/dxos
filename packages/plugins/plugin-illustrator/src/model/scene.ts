//
// Copyright 2026 DXOS.org
//

//
// Backend-neutral scene DSL: a diagram is a set of named world objects ("face", "hat"),
// each composed of graphical elements (rect, ellipse, line, curve, text, arrow) authored
// in object-local units. A backend compiler (tldraw today) maps the scene onto the
// concrete canvas; see `render.ts` / `read.ts`.
//

import * as Schema from 'effect/Schema';

export const Color = Schema.Literal(
  'black',
  'grey',
  'light-violet',
  'violet',
  'blue',
  'light-blue',
  'yellow',
  'orange',
  'green',
  'light-green',
  'light-red',
  'red',
  'white',
);
export type Color = Schema.Schema.Type<typeof Color>;

export const Fill = Schema.Literal('none', 'solid', 'pattern');
export type Fill = Schema.Schema.Type<typeof Fill>;

export const Stroke = Schema.Literal('sketchy', 'solid', 'dashed', 'dotted');
export type Stroke = Schema.Schema.Type<typeof Stroke>;

export const Weight = Schema.Literal('s', 'm', 'l', 'xl');
export type Weight = Schema.Schema.Type<typeof Weight>;

export const Point = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
});
export type Point = Schema.Schema.Type<typeof Point>;

/** Style props shared by all elements; every field is optional with sensible defaults. */
const styleFields = {
  color: Schema.optional(Color).annotations({ description: 'Stroke/text color.' }),
  fill: Schema.optional(Fill).annotations({ description: 'Interior fill of closed shapes.' }),
  stroke: Schema.optional(Stroke).annotations({ description: 'Stroke rendering; sketchy is hand-drawn.' }),
  weight: Schema.optional(Weight).annotations({ description: 'Stroke weight / text size.' }),
};

const id = Schema.String.annotations({
  description: 'Stable element id, unique within the object (e.g. "left-eye"). Used to edit or delete the element.',
});

/** Closed shape drawn inside a local bounding box. */
export const Box = Schema.Struct({
  kind: Schema.Literal('rect', 'ellipse', 'diamond', 'triangle'),
  id,
  x: Schema.Number.annotations({ description: 'Left edge (object-local units).' }),
  y: Schema.Number.annotations({ description: 'Top edge (object-local units).' }),
  w: Schema.Number,
  h: Schema.Number,
  rotation: Schema.optional(Schema.Number).annotations({ description: 'Clockwise rotation in degrees.' }),
  text: Schema.optional(Schema.String).annotations({ description: 'Centered label.' }),
  ...styleFields,
});
export type Box = Schema.Schema.Type<typeof Box>;

/** Circle sugar; reads back as an ellipse. */
export const Circle = Schema.Struct({
  kind: Schema.Literal('circle'),
  id,
  cx: Schema.Number.annotations({ description: 'Center x (object-local units).' }),
  cy: Schema.Number.annotations({ description: 'Center y (object-local units).' }),
  r: Schema.Number,
  text: Schema.optional(Schema.String),
  ...styleFields,
});
export type Circle = Schema.Schema.Type<typeof Circle>;

/** Straight segment or open polyline through the given points. */
export const Polyline = Schema.Struct({
  kind: Schema.Literal('line'),
  id,
  points: Schema.Array(Point).annotations({ description: 'Two or more points (object-local units).' }),
  closed: Schema.optional(Schema.Boolean).annotations({ description: 'Close the path back to the first point.' }),
  ...styleFields,
});
export type Polyline = Schema.Schema.Type<typeof Polyline>;

/** Smooth curve through the given points (spline). */
export const Curve = Schema.Struct({
  kind: Schema.Literal('curve'),
  id,
  points: Schema.Array(Point).annotations({ description: 'Control points the curve passes through.' }),
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
  w: Schema.optional(Schema.Number).annotations({ description: 'Wrap width; omit for auto-size.' }),
  text: Schema.String,
  ...styleFields,
});
export type Text = Schema.Schema.Type<typeof Text>;

/**
 * Connector. Endpoints are element refs — `"<elementId>"` within the same object or
 * `"<objectId>/<elementId>"` across objects — or explicit local points. Bound endpoints
 * track their target when it moves.
 */
export const Arrow = Schema.Struct({
  kind: Schema.Literal('arrow'),
  id,
  from: Schema.optional(Schema.String).annotations({ description: 'Source element ref.' }),
  to: Schema.optional(Schema.String).annotations({ description: 'Target element ref.' }),
  start: Schema.optional(Point).annotations({ description: 'Explicit start (used when `from` is omitted).' }),
  end: Schema.optional(Point).annotations({ description: 'Explicit end (used when `to` is omitted).' }),
  text: Schema.optional(Schema.String).annotations({ description: 'Label at the arrow midpoint.' }),
  ...styleFields,
});
export type Arrow = Schema.Schema.Type<typeof Arrow>;

export const Element = Schema.Union(Box, Circle, Polyline, Curve, Arc, Text, Arrow);
export type Element = Schema.Schema.Type<typeof Element>;

/**
 * A semantic group of elements ("face", "hat") authored in its own local unit space.
 * `origin` (canvas px) and `scale` (px per unit) place it on the canvas:
 * `canvas = origin + local * scale`. On read, `origin` is derived as the top-left of the
 * object's bounding box, so the model survives users dragging shapes around.
 */
export const WorldObject = Schema.Struct({
  id: Schema.String.annotations({
    description: 'Stable object id naming the thing depicted (e.g. "face", "hat").',
  }),
  origin: Schema.optional(Point).annotations({
    description: 'Canvas position (px). Omit on upsert to keep the current position.',
  }),
  scale: Schema.optional(Schema.Number).annotations({ description: 'Canvas px per local unit (default 1).' }),
  elements: Schema.Array(Element),
});
export type WorldObject = Schema.Schema.Type<typeof WorldObject>;

export const Scene = Schema.Struct({
  objects: Schema.Array(WorldObject),
});
export type Scene = Schema.Schema.Type<typeof Scene>;

//
// Edit commands.
//

export const UpsertObject = Schema.Struct({
  op: Schema.Literal('upsert-object'),
  object: WorldObject,
}).annotations({ description: 'Create an object, or replace an existing one wholesale (same id).' });

export const UpsertElements = Schema.Struct({
  op: Schema.Literal('upsert-elements'),
  objectId: Schema.String,
  elements: Schema.Array(Element),
}).annotations({ description: 'Add elements to an existing object, replacing any with matching ids.' });

export const RemoveElements = Schema.Struct({
  op: Schema.Literal('remove-elements'),
  objectId: Schema.String,
  elementIds: Schema.Array(Schema.String),
});

export const RemoveObject = Schema.Struct({
  op: Schema.Literal('remove-object'),
  objectId: Schema.String,
});

export const MoveObject = Schema.Struct({
  op: Schema.Literal('move-object'),
  objectId: Schema.String,
  origin: Point.annotations({ description: 'New canvas position (px) for the object top-left.' }),
});

export const Command = Schema.Union(UpsertObject, UpsertElements, RemoveElements, RemoveObject, MoveObject);
export type Command = Schema.Schema.Type<typeof Command>;
