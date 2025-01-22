//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import { Graph } from '@dxos/graph';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?

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
    classNames: S.optional(S.String),
  }),
);

export type Shape = S.Schema.Type<typeof Shape>;

/**
 * Connections between shapes.
 */
export const Connection = S.Struct({
  input: S.String,
  output: S.String,
});

export type Connection = S.Schema.Type<typeof Connection>;

// TODO(burdon): Rename scene?
export const Layout = S.Struct({
  shapes: S.mutable(S.Array(Shape)),
});

export type Layout = S.Schema.Type<typeof Layout>;

export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),

  /**
   * Graph of shapes positioned on the canvas.
   */
  layout: Graph,
}) {}
