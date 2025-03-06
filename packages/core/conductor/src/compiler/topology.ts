//
// Copyright 2025 DXOS.org
//

import { AST, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type ComputeGraphModel, type ComputeNode, type ComputeMeta } from '../types';
import { pickProperty } from '../util';

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

type TopologyNodeInput = {
  name: string;
  schema: S.Schema.AnyNoContext;
  sourceNodeId?: string;
  sourceNodeOutput?: string;
};

type TopologyNodeOutputBinding = {
  nodeId: string;
  property: string;
};

type TopologyNodeOutput = {
  name: string;
  schema: S.Schema.AnyNoContext;
  /**
   * Nodes that this output is bound to.
   */
  boundTo: TopologyNodeOutputBinding[];
};

export type TopologyNode = {
  id: string;
  graphNode: ComputeNode; // TODO(burdon): Rename computeNode.
  meta: ComputeMeta;
  inputs: TopologyNodeInput[];
  outputs: TopologyNodeOutput[];
};

export type GraphDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type CreateTopologyParams = {
  graph: ComputeGraphModel;
  computeMetaResolver: (node: ComputeNode) => Promise<ComputeMeta>;
};

/**
 * Creates a topology from a compute graph by resolving node metadata and building input/output connections.
 * The topology represents the static structure and data flow of the graph.
 *
 * @param params.graph - The compute graph model to create topology from
 * @param params.computeMetaResolver - Function that resolves compute metadata for a given node
 * @returns A topology containing nodes with their inputs/outputs and any diagnostics
 */
export const createTopology = async ({ graph, computeMetaResolver }: CreateTopologyParams): Promise<Topology> => {
  const topology: Omit<Topology, 'inputSchema' | 'outputSchema'> = {
    nodes: [],
    diagnostics: [],
  };

  // Process nodes.
  for (const node of graph.nodes) {
    const meta = await computeMetaResolver(node);
    if (!meta) {
      throw new Error(`No meta for node: ${node.type}`);
    }

    topology.nodes.push({
      id: node.id,
      graphNode: node,
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

    if (sourceNode.outputs.find((output) => output.name === edge.output) == null) {
      const schema = pickProperty(sourceNode.meta.output, edge.output);
      sourceNode.outputs.push({
        name: edge.output,
        schema,
        boundTo: [],
      });
      if (AST.isNeverKeyword(schema.ast)) {
        log.info('setting never output on node:', {
          sourceNode: sourceNode.graphNode.type,
          output: edge.output,
          type: schema.ast,
          nodeOutputType: sourceNode.meta.output.ast,
        });
      }
    }

    if (targetNode.inputs.find((input) => input.name === edge.input) == null) {
      targetNode.inputs.push({
        name: edge.input,
        schema: pickProperty(targetNode.meta.input, edge.input),
        sourceNodeId: sourceNode.id,
        sourceNodeOutput: edge.output,
      });
    }

    // TODO(dmaretskyi): Check assignability.

    const output = sourceNode.outputs.find((output) => output.name === edge.output);
    invariant(output);
    const input = targetNode.inputs.find((input) => input.name === edge.input);
    invariant(input);

    output.boundTo.push({
      nodeId: targetNode.id,
      property: input.name,
    });

    if (AST.isNeverKeyword(output.schema.ast)) {
      log.warn('output does not exist on node:', { source: targetNode.graphNode.type, target: output.name });
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: `output does not exist on node: [${sourceNode.graphNode.type}] -> ${output.name}`,
      });
    }

    if (AST.isNeverKeyword(input.schema.ast)) {
      log.warn('input does not exist on node:', { source: input.name, target: targetNode.graphNode.type });
      topology.diagnostics.push({
        severity: 'error',
        edgeId: edge.id,
        message: `input does not exist on node: ${input.name} -> [${targetNode.graphNode.type}]`,
      });
    }
  }

  return topology;
};
