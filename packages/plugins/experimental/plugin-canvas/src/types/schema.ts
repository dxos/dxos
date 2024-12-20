//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';

export const Point = S.Struct({ x: S.Number, y: S.Number });
export const Dimension = S.Struct({ width: S.Number, height: S.Number });
export const Rect = S.extend(Point, Dimension);

export const BaseShape = S.mutable(
  S.Struct({
    id: S.String,
    object: S.optional(Ref(Expando)),
    label: S.optional(S.String),
  }),
);

export const DraggableShape = S.extend(
  BaseShape,
  S.Struct({
    center: Point,
    size: Dimension,
  }),
);

export const RectangleShape = S.extend(
  DraggableShape,
  S.Struct({
    type: S.Literal('rectangle'),
    rounded: S.optional(S.Number),
  }),
);

export const EllipseShape = S.extend(
  DraggableShape,
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
// TODO(burdon): Consider interop with TLDraw schema.
export const Shape = S.Union(RectangleShape, EllipseShape, LineShape);

export const Layout = S.Struct({
  shapes: S.mutable(S.Array(Shape)),
});

export type Point = S.Schema.Type<typeof Point>;
export type Dimension = S.Schema.Type<typeof Dimension>;
export type Rect = S.Schema.Type<typeof Rect>;

export type Shape = S.Schema.Type<typeof Shape>;

export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
export type EllipseShape = S.Schema.Type<typeof EllipseShape>;
export type LineShape = S.Schema.Type<typeof LineShape>;

export type Layout = S.Schema.Type<typeof Layout>;

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  layout: Layout,
}) {}
