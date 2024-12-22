//
// Copyright 2024 DXOS.org
//

import { S, TypedObject, Expando, Ref } from '@dxos/echo-schema';
import { Point, Dimension } from '@dxos/react-ui-canvas';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standard.

/**
 * Base type for all shapes.
 */
export const BaseShape = S.mutable(
  S.Struct({
    id: S.String,
    type: S.String,
    object: S.optional(Ref(Expando)),
    text: S.optional(S.String),
    // TODO(burdon): Generic tag.
    guide: S.optional(S.Boolean),
  }),
);

/**
 * A closed shape.
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

export const LineShape = S.extend(
  BaseShape,
  S.Struct({
    type: S.Literal('line'),
    path: S.String,
    start: S.optional(S.String),
    end: S.optional(S.String),
  }),
);

/**
 * Discriminated union.
 */
export const Shape = S.Union(RectangleShape, EllipseShape, LineShape);

export const Layout = S.Struct({
  shapes: S.mutable(S.Array(Shape)),
});

export type BaseShape = S.Schema.Type<typeof BaseShape>;
export type PolygonShape = S.Schema.Type<typeof PolygonShape>;
export type Shape = S.Schema.Type<typeof Shape>;

export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
export type EllipseShape = S.Schema.Type<typeof EllipseShape>;
export type LineShape = S.Schema.Type<typeof LineShape>;

export type Layout = S.Schema.Type<typeof Layout>;

export const isPolygon = S.is(PolygonShape);
export const isLine = S.is(LineShape);

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  layout: Layout,
}) {}
