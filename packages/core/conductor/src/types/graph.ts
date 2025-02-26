//
// Copyright 2025 DXOS.org
//

import { JsonSchemaType, Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';
import { FunctionType } from '@dxos/functions';
import { BaseGraphEdge, BaseGraphNode, Graph } from '@dxos/graph';

export const ComputeValueType = S.Literal('string', 'number', 'boolean', 'object');
export type ComputeValueType = S.Schema.Type<typeof ComputeValueType>;

/**
 * GraphNode.
 */
export const ComputeNode = S.extend(
  BaseGraphNode,

  /**
   * NOTE: We have a mixin of properties for different node types for simplicity,rather than a discriminated union.
   */
  // TODO(burdon): Split out into different types.
  S.Struct({
    /** For template nodes. */
    // TODO(dmaretskyi): Compute at runtime -- don't persist.
    inputSchema: S.optional(JsonSchemaType),
    outputSchema: S.optional(JsonSchemaType),

    /** For composition nodes. */
    subgraph: S.optional(S.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

    /** For composition of function nodes. */
    function: S.optional(Ref(FunctionType)),

    /**
     * For template nodes determines the type of the value.
     * We cannot rely on `typeof value` as for object nodes we want to store potentially broken JSON as text.
     * For valueType === 'object' we store the JSON as text in `value`.
     */
    valueType: S.optional(ComputeValueType),

    /** For constant and template nodes. */
    value: S.optional(S.Any),

    /** For switch nodes. */
    // TODO(dmaretskyi): Reuse `value`.
    enabled: S.optional(S.Boolean),
  }),
).pipe(S.mutable);

export type ComputeNode = S.Schema.Type<typeof ComputeNode>;

/**
 * GraphEdge.
 */
export const ComputeEdge = S.extend(
  BaseGraphEdge,

  S.Struct({
    /** Output property from source. */
    output: S.String,

    /** Input property to target. */
    input: S.String,
  }),
);

export type ComputeEdge = S.Schema.Type<typeof ComputeEdge>;

/**
 * Persistent graph.
 */
export class ComputeGraph extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  // NOTE: Cast required as workaround for TS compiler bug.
  graph: Graph as S.Schema<Graph>,

  // Reference nodes.
  input: S.optional(BaseGraphNode),
  output: S.optional(BaseGraphNode),
}) {}

export const isComputeGraph = S.is(ComputeGraph);
