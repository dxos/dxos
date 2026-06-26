//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { DXN, JsonSchema, Obj, Ref, Type } from '@dxos/echo';
import { Graph } from '@dxos/graph';

export const ComputeValueType = Schema.Literal('string', 'number', 'boolean', 'object');

export type ComputeValueType = Schema.Schema.Type<typeof ComputeValueType>;

/**
 * GraphNode.
 * NOTE: We have a mixin of properties for different node types for simplicity, rather than a discriminated union.
 */
export const ComputeNode = Schema.extend(
  Graph.Node,
  Schema.Struct({
    /** For template nodes. */
    // TODO(dmaretskyi): Compute at runtime (don't persist).
    inputSchema: Schema.optional(JsonSchema.JsonSchema),
    outputSchema: Schema.optional(JsonSchema.JsonSchema),

    /**
     * For composition nodes.
     */
    subgraph: Schema.optional(Schema.suspend((): Ref.RefSchema<ComputeGraph> => Ref.Ref(ComputeGraph))),

    /**
     * For composition of function nodes.
     */
    function: Schema.optional(Ref.Ref(Operation.PersistentOperation)),

    /**
     * For template nodes determines the type of the value.
     * We cannot rely on `typeof value` as for object nodes we want to store potentially broken JSON as text.
     * For valueType === 'object' we store the JSON as text in `value`.
     */
    valueType: Schema.optional(ComputeValueType),

    /**
     * For constant and template nodes.
     */
    value: Schema.optional(Schema.Any),

    /**
     * For switch nodes.
     * @deprecated
     */
    // TODO(dmaretskyi): Reuse `value`.
    enabled: Schema.optional(Schema.Boolean),
  }),
).pipe(Schema.mutable);

export interface ComputeNode extends Schema.Schema.Type<typeof ComputeNode> {}

// TODO(dmaretskyi): To effect schema.
export type ComputeNodeMeta = {
  input: Schema.Schema.AnyNoContext;
  output: Schema.Schema.AnyNoContext;
};

/**
 * GraphEdge.
 */
export const ComputeEdge = Schema.extend(
  Graph.Edge,
  Schema.Struct({
    // TODO(burdon): Rename sourceProp, targetProp?

    /** Input property to target. */
    input: Schema.String,

    /** Output property from source. */
    output: Schema.String,
  }),
);

export type ComputeEdge = Schema.Schema.Type<typeof ComputeEdge>;

/**
 * Persistent graph.
 */
export class ComputeGraph extends Type.makeObject<ComputeGraph>(DXN.make('org.dxos.type.computeGraph', '0.1.0'))(
  Schema.Struct({
    graph: Graph.Graph,

    // Reference nodes.
    input: Schema.optional(ComputeNode),
    output: Schema.optional(ComputeNode),
  }),
) {}

export const isComputeGraph = Obj.instanceOf(ComputeGraph);
