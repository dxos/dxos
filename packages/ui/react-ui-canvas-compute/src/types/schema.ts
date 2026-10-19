//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ComputeGraph, ComputeGraphModel } from '@dxos/conductor';
import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as GraphEdge from '@dxos/graph/GraphEdge';
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

/** Extra keys of any type, so a stored element keeps whatever fields its editor wrote. */
const OpenFields = [Schema.Record(Schema.String, Schema.Any)] as const;

/**
 * A board's stored graph. Its shapes and connections carry their editor's fields (a shape's `center`, `size` and
 * `text`, a connection's `input` and `output`) beside the graph's own, so the elements are open: ECHO rejects an
 * undeclared key on write, which would refuse every edit to a board.
 */
const LayoutData = Schema.Struct({
  id: Schema.optional(Schema.String),
  nodes: Schema.mutable(Schema.Array(Schema.StructWithRest(GraphNode.GraphNode, OpenFields))),
  edges: Schema.mutable(Schema.Array(Schema.StructWithRest(GraphEdge.GraphEdge, OpenFields))),
});

// TODO(wittjosiah): Rename WorkflowType?
export class CanvasBoard extends Type.makeObject<CanvasBoard>(DXN.make('org.dxos.type.canvasBoard', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),

    computeGraph: Schema.optional(Ref.Ref(ComputeGraph)),

    /**
     * Graph of shapes positioned on the canvas.
     */
    layout: LayoutData,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--infinity--regular', hue: 'sky' }), Annotation.UserType.set()),
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
