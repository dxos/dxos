//
// Copyright 2025 DXOS.org
//

import { AST, type S } from '@dxos/echo-schema';
import type { GraphEdge, GraphModel, GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { ComputeNode, ComputeEdge, ComputeMeta } from './schema';
import { pickProperty } from './util';

/**
 * Structure derived from the compute graph.
 * Validates the edges and types.
 * Is used to run the computation.
 */
export type Topology = {
  // TODO(burdon): Map?
  nodes: TopologyNode[];

  // TODO(burdon): Part of topology?
  diagnostics: GraphDiagnostic[];
};

/**
 *
 */
export type TopologyNode = {
  id: string;
  graphNode: ComputeNode;
  meta: ComputeMeta;

  inputs: {
    name: string;
    schema: S.Schema.AnyNoContext;
    sourceNodeId?: string;
    sourceNodeOutput?: string;
  }[];

  outputs: {
    name: string;
    schema: S.Schema.AnyNoContext;

    /**
     * Nodes that this output is bound to.
     */
    boundTo: {
      nodeId: string;
      property: string;
    }[];
  }[];
};

export type GraphDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type CreateTopologyParams = {
  graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;
  computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
};

/**
 *
 * @param graph
 * @param inputNodeId
 * @param outputNodeId
 * @param computeMetaResolver
 */
export const createTopology = async ({ graph, computeMetaResolver }: CreateTopologyParams): Promise<Topology> => {
  const topology: Omit<Topology, 'inputSchema' | 'outputSchema'> = {
    nodes: [],
    diagnostics: [],
  };

  // Process nodes.
  for (const node of graph.nodes) {
    const meta = await computeMetaResolver(node.data);
    if (!meta) {
      throw new Error(`No meta for node: ${node.data.type}`);
    }

    topology.nodes.push({
      id: node.id,
      graphNode: node.data,
      meta,
      inputs: [],
      outputs: [],
    });
  }

  // Process edges.
  for (const edge of graph.edges) {
    const sourceNode = topology.nodes.find((node) => node.id === edge.source);
    const targetNode = topology.nodes.find((node) => node.id === edge.target);
    if (sourceNode == null || targetNode == null) {
      continue; // TODO(burdon): Warn.
    }

    if (sourceNode.outputs.find((output) => output.name === edge.data.output) == null) {
      const schema = pickProperty(sourceNode.meta.output, edge.data.output);
      sourceNode.outputs.push({
        name: edge.data.output,
        schema,
        boundTo: [],
      });
      if (AST.isNeverKeyword(schema.ast)) {
        log.info('setting never output on node:', {
          sourceNode: sourceNode.graphNode.type,
          output: edge.data.output,
          type: schema.ast,
          nodeOutputType: sourceNode.meta.output.ast,
        });
      }
    }

    if (targetNode.inputs.find((input) => input.name === edge.data.input) == null) {
      targetNode.inputs.push({
        name: edge.data.input,
        schema: pickProperty(targetNode.meta.input, edge.data.input),
        sourceNodeId: sourceNode.id,
        sourceNodeOutput: edge.data.output,
      });
    }

    // TODO(dmaretskyi): Check assignability.

    // TODO(burdon): Set above? (i.e., let input = ...).
    const output = sourceNode.outputs.find((output) => output.name === edge.data.output);
    invariant(output);
    const input = targetNode.inputs.find((input) => input.name === edge.data.input);
    invariant(input);

    output.boundTo.push({
      nodeId: targetNode.id,
      property: input.name,
    });

    // TODO(burdon): Output first?
    if (AST.isNeverKeyword(output.schema.ast)) {
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: `Output does not exist on node: [${sourceNode.graphNode.type}] -> ${output.name}`,
      });
    }

    if (AST.isNeverKeyword(input.schema.ast)) {
      log.info('Input does not exist on node:', {
        targetNode: targetNode.graphNode.type,
        input: input.name,
        type: input.schema.ast,
        nodeInputType: targetNode.meta.input.ast,
        pickProperty: pickProperty(targetNode.meta.input, input.name).ast,
      });
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: `Input does not exist on node: ${input.name} -> [${targetNode.graphNode.type}]`,
      });
    }
  }

  return topology;
};
