//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Dimension, Point } from '@dxos/react-ui-canvas/types';

import { Shape } from './schema';

//
// Path
//

export const PathShape = Shape.mapFields(
  Struct.assign({
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
// `Schema.mutable` is arrays-only in v4, so a struct's fields are made mutable key by key.
export const Polygon = Shape.mapFields(
  Struct.assign({
    center: Point,
    size: Dimension.mapFields(Struct.map(Schema.mutableKey)),
  }),
).mapFields(Struct.map(Schema.mutableKey));

export type Polygon = Schema.Schema.Type<typeof Polygon>;
export const isPolygon = Schema.is(Polygon);

export const EllipseShape = Polygon.mapFields(
  Struct.assign({
    type: Schema.Literal('ellipse'),
  }),
);

export type EllipseShape = Schema.Schema.Type<typeof EllipseShape>;

export const NoteShape = Polygon.mapFields(
  Struct.assign({
    type: Schema.Literal('note'),
  }),
);

export type NoteShape = Schema.Schema.Type<typeof NoteShape>;

export const RectangleShape = Polygon.mapFields(
  Struct.assign({
    type: Schema.Literal('rectangle'),
    rounded: Schema.optional(Schema.Number),
  }),
);

export type RectangleShape = Schema.Schema.Type<typeof RectangleShape>;
