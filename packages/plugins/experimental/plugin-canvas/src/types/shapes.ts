//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { Dimension, Point } from '@dxos/react-ui-canvas';

import { Shape } from './schema';

//
// Path
//

export const PathShape = S.extend(
  Shape,
  S.Struct({
    kind: S.Literal('path'),
    path: S.String,
    start: S.optional(S.String),
    end: S.optional(S.String),
  }),
);

export type PathShape = S.Schema.Type<typeof PathShape>;
export const isPath = S.is(PathShape);

//
// Polygon
//

/**
 * Closed shape.
 * Common handling via Frame.
 */
export const Polygon = S.mutable(
  S.extend(
    Shape,
    S.Struct({
      center: Point,
      size: S.mutable(Dimension),
    }),
  ),
);

export type Polygon = S.Schema.Type<typeof Polygon>;
export const isPolygon = S.is(Polygon);

export const EllipseShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('ellipse'),
  }),
);

export type EllipseShape = S.Schema.Type<typeof EllipseShape>;

export const NoteShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('note'),
  }),
);

export type NoteShape = S.Schema.Type<typeof NoteShape>;

export const RectangleShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('rectangle'),
    rounded: S.optional(S.Number),
  }),
);

export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
