//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ComputeGraph, ComputeGraphModel } from '@dxos/conductor';
import { Obj, Ref, Type } from '@dxos/echo';
import { Graph } from '@dxos/graph';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?

/**
 * Base type for all shapes.
 */
export const Shape = Schema.extend(
  Graph.Node.pipe(Schema.omit('type')), // TODO(burdon): Breaks graph contract?
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
  Graph.Edge,
  Schema.Struct({
    input: Schema.optional(Schema.String),
    output: Schema.optional(Schema.String),
  }),
);

export type Connection = Schema.Schema.Type<typeof Connection>;

// TODO(burdon): Rename scene?
export const Layout = Schema.Struct({
  shapes: Schema.Array(Shape),
});

export type Layout = Schema.Schema.Type<typeof Layout>;

// TODO(wittjosiah): Rename WorkflowType?
export const CanvasBoard = Schema.Struct({
  name: Schema.optional(Schema.String),

  computeGraph: Schema.optional(Type.Ref(ComputeGraph)),

  /**
   * Graph of shapes positioned on the canvas.
   */
  layout: Graph.Graph,
}).pipe(
  Type.object({
    typename: 'dxos.org/type/CanvasBoard',
    version: '0.1.0',
  }),
);

export type CanvasBoard = Schema.Schema.Type<typeof CanvasBoard>;

/**
 * Creates a CanvasBoard with default empty layout and compute graph when not provided.
 */
export const make = (props: Partial<Obj.MakeProps<typeof CanvasBoard>> = {}) => {
  return Obj.make(CanvasBoard, {
    ...props,
    layout: props.layout ?? { nodes: [], edges: [] },
    computeGraph: props.computeGraph ?? Ref.make(ComputeGraphModel.create().root),
  });
};
