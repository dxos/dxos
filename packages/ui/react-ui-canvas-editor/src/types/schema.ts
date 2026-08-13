//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ComputeGraph, ComputeGraphModel } from '@dxos/conductor';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as GraphEdge from '@dxos/graph/GraphEdge';
import * as GraphModel from '@dxos/graph/GraphModel';
import * as GraphNode from '@dxos/graph/GraphNode';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?

/**
 * Base type for all shapes.
 */
export const Shape = GraphNode.GraphNode.mapFields((fields) => Struct.omit(fields, ['type'])).pipe(
  // TODO(burdon): Breaks graph contract?
  Schema.fieldsAssign({
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
export const Connection = GraphEdge.GraphEdge.mapFields(
  Struct.assign({
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
export class CanvasBoard extends Type.makeObject<CanvasBoard>(DXN.make('org.dxos.type.canvasBoard', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),

    computeGraph: Schema.optional(Ref.Ref(ComputeGraph)),

    /**
     * Graph of shapes positioned on the canvas.
     */
    layout: GraphModel.Data,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--infinity--regular', hue: 'sky' })),
) {}

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
