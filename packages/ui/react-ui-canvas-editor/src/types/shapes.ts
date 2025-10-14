//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Dimension, Point } from '@dxos/react-ui-canvas';

import { Shape } from './schema';

//
// Path
//

export const PathShape = Schema.extend(
  Shape,
  Schema.Struct({
    type: Schema.Literal('path'),
    path: Schema.String,
    start: Schema.optional(Schema.String),
    end: Schema.optional(Schema.String),
  }),
);

export type PathShape = Schema.Schema.Type<typeof PathShape>;
export const isPath = Schema.is(PathShape);

//
// Polygon
//

/**
 * Closed shape.
 * Common handling via Frame.
 */
export const Polygon = Schema.mutable(
  Schema.extend(
    Shape,
    Schema.Struct({
      center: Point,
      size: Schema.mutable(Dimension),
    }),
  ),
);

export type Polygon = Schema.Schema.Type<typeof Polygon>;
export const isPolygon = Schema.is(Polygon);

export const EllipseShape = Schema.extend(
  Polygon,
  Schema.Struct({
    type: Schema.Literal('ellipse'),
  }),
);

export type EllipseShape = Schema.Schema.Type<typeof EllipseShape>;

export const NoteShape = Schema.extend(
  Polygon,
  Schema.Struct({
    type: Schema.Literal('note'),
  }),
);

export type NoteShape = Schema.Schema.Type<typeof NoteShape>;

export const RectangleShape = Schema.extend(
  Polygon,
  Schema.Struct({
    type: Schema.Literal('rectangle'),
    rounded: Schema.optional(Schema.Number),
  }),
);

export type RectangleShape = Schema.Schema.Type<typeof RectangleShape>;
