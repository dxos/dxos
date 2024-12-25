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
export const Shape = S.mutable(
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
export const Polygon = S.mutable(
  S.extend(
    Shape,
    S.Struct({
      center: Point,
      size: S.mutable(Dimension),
    }),
  ),
);

export const RectangleShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('rectangle'),
    rounded: S.optional(S.Number),
  }),
);

export const EllipseShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('ellipse'),
  }),
);

export const PathShape = S.extend(
  Shape,
  S.Struct({
    type: S.Literal('path'),
    path: S.String,
    start: S.optional(S.String),
    end: S.optional(S.String),
  }),
);

// TODO(burdon): Rename scene?
export const Layout = S.Struct({
  shapes: S.mutable(S.Array(Shape)),
});

export type Shape = S.Schema.Type<typeof Shape>;
export type Polygon = S.Schema.Type<typeof Polygon>;

// TODO(burdon): Factor out.
export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
export type EllipseShape = S.Schema.Type<typeof EllipseShape>;
export type PathShape = S.Schema.Type<typeof PathShape>;

// TODO(burdon): Remove?
export const isPolygon = S.is(Polygon);
export const isPath = S.is(PathShape);

export type Layout = S.Schema.Type<typeof Layout>;

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  graph: Graph,
}) {}
