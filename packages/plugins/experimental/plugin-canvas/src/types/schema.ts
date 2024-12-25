//
// Copyright 2024 DXOS.org
//

import { S, TypedObject, Expando, Ref } from '@dxos/echo-schema';
import { Graph } from '@dxos/graph';
import { Point, Dimension } from '@dxos/react-ui-canvas';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards.

/**
 * Base type for all shapes.
 */
// TODO(burdon): Rename (Shape suffix should be a well formed Shape type).
export const BaseShape = S.mutable(
  S.Struct({
    id: S.String,
    type: S.String,
    text: S.optional(S.String),
    // TODO(burdon): Generic tag.
    guide: S.optional(S.Boolean),
    // External object.
    object: S.optional(Ref(Expando)),
  }),
);

/**
 * Closed shape.
 * Common handling via Frame.
 */
// TODO(burdon): Rename.
export const BasePolygonShape = S.mutable(
  S.extend(
    BaseShape,
    S.Struct({
      center: Point,
      size: S.mutable(Dimension),
    }),
  ),
);

export const RectangleShape = S.extend(
  BasePolygonShape,
  S.Struct({
    type: S.Literal('rectangle'),
    rounded: S.optional(S.Number),
  }),
);

export const EllipseShape = S.extend(
  BasePolygonShape,
  S.Struct({
    type: S.Literal('ellipse'),
  }),
);

export const PathShape = S.extend(
  BaseShape,
  S.Struct({
    type: S.Literal('path'),
    path: S.String,
    start: S.optional(S.String),
    end: S.optional(S.String),
  }),
);

export const FunctionProperty = S.Struct({
  name: S.String,
  // TODO(burdon): Use echo definitions?
  type: S.Union(S.Literal('string'), S.Literal('number'), S.Literal('boolean')),
});

export const FunctionShape = S.extend(
  BasePolygonShape,
  S.Struct({
    type: S.Literal('function'),
    // TODO(burdon): These data should be in the graph structure (not UX)?
    properties: S.mutable(S.Array(FunctionProperty)),
  }),
);

/**
 * Discriminated union.
 */
// TODO(burdon): Extensible?
export const Shape = S.Union(RectangleShape, EllipseShape, PathShape, FunctionShape);

export const Layout = S.Struct({
  shapes: S.mutable(S.Array(Shape)),
});

export type BaseShape = S.Schema.Type<typeof BaseShape>;

export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
export type EllipseShape = S.Schema.Type<typeof EllipseShape>;
export type PathShape = S.Schema.Type<typeof PathShape>;

export type FunctionProperty = S.Schema.Type<typeof FunctionProperty>;
export type FunctionShape = S.Schema.Type<typeof FunctionShape>;

export type Shape = S.Schema.Type<typeof Shape>;

// TODO(burdon): Correct way to narrow Shape to a Polygon?
export type PolygonShape = Shape & S.Schema.Type<typeof BasePolygonShape>;

export const isPolygon = S.is(BasePolygonShape);
export const isPath = S.is(PathShape);

export type Layout = S.Schema.Type<typeof Layout>;

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  graph: Graph,
}) {}
