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
 */
export const PolygonShape = S.mutable(
  S.extend(
    BaseShape,
    S.Struct({
      center: Point,
      size: Dimension,
    }),
  ),
);

export const RectangleShape = S.extend(
  PolygonShape,
  S.Struct({
    type: S.Literal('rectangle'),
    rounded: S.optional(S.Number),
  }),
);

export const EllipseShape = S.extend(
  PolygonShape,
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
  PolygonShape,
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
export type PolygonShape = S.Schema.Type<typeof PolygonShape>;

export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
export type EllipseShape = S.Schema.Type<typeof EllipseShape>;
export type PathShape = S.Schema.Type<typeof PathShape>;

export type FunctionProperty = S.Schema.Type<typeof FunctionProperty>;
export type FunctionShape = S.Schema.Type<typeof FunctionShape>;

export type Shape = S.Schema.Type<typeof Shape>;
export type Layout = S.Schema.Type<typeof Layout>;

export const isPolygon = S.is(PolygonShape);
export const isPath = S.is(PathShape);

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  graph: Graph,
}) {}
