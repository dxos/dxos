//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import { Graph } from '@dxos/graph';
import { Point, Dimension } from '@dxos/react-ui-canvas';
import { Ref } from '@dxos/echo-schema';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?

export const Connection = S.Struct({
  input: S.optional(S.String),
  output: S.optional(S.String),
});

export type Connection = S.Schema.Type<typeof Connection>;

/**
 * Base type for all shapes.
 */
export const Shape = S.mutable(
  S.Struct({
    id: S.String,
    type: S.String,
    text: S.optional(S.String),
    // TODO(burdon): Generic tag?
    guide: S.optional(S.Boolean),
  }),
);

export type Shape = S.Schema.Type<typeof Shape>;

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

// TODO(burdon): Factor out.
export type RectangleShape = S.Schema.Type<typeof RectangleShape>;
export type EllipseShape = S.Schema.Type<typeof EllipseShape>;
export type PathShape = S.Schema.Type<typeof PathShape>;

// TODO(burdon): Remove?
export const isPolygon = S.is(Polygon);
export const isPath = S.is(PathShape);

export type Layout = S.Schema.Type<typeof Layout>;

export class ComputeGraph extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  graph: Graph,
}) {}

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),
  /**
   * Graph of shapes positioned on the canvas.
   */
  shapes: Graph,

  /**
   * Reference to the object containing the data graph.
   */
  // TODO(dmaretskyi): Generalize not to depend on ComputeGraph.
  data: Ref(ComputeGraph),
}) {}
