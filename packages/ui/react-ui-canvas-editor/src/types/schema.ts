//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ComputeGraph } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { Ref } from '@dxos/echo/internal';
import { BaseGraphEdge, BaseGraphNode, Graph } from '@dxos/graph';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?

/**
 * Base type for all shapes.
 */
export const Shape = Schema.extend(
  BaseGraphNode.pipe(Schema.omit('type')),
  Schema.Struct({
    type: Schema.String,
    text: Schema.optional(Schema.String),
    guide: Schema.optional(Schema.Boolean),
    classNames: Schema.optional(Schema.String),
  }),
);

export type Shape = Schema.Schema.Type<typeof Shape>;

/**
 * Connections between shapes.
 */
export const Connection = Schema.extend(
  BaseGraphEdge,
  Schema.Struct({
    input: Schema.optional(Schema.String),
    output: Schema.optional(Schema.String),
  }),
);

export type Connection = Schema.Schema.Type<typeof Connection>;

// TODO(burdon): Rename scene?
export const Layout = Schema.Struct({
  shapes: Schema.mutable(Schema.Array(Shape)),
});

export type Layout = Schema.Schema.Type<typeof Layout>;

// TODO(wittjosiah): Rename WorkflowType?
export const CanvasBoardType = Schema.Struct({
  name: Schema.optional(Schema.String),

  computeGraph: Schema.optional(Ref(ComputeGraph)),

  /**
   * Graph of shapes positioned on the canvas.
   */
  layout: Graph,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/CanvasBoard',
    version: '0.1.0',
  }),
);
