//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { raise } from '@dxos/debug';
import { type GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';

import { compile } from '../fiber-compiler';
import { inputNode, outputNode } from '../nodes/base-nodes';
import { gptNode } from '../nodes/gpt-node';
import {
  NodeType,
  type ComputeEdge,
  type ComputeImplementation,
  type ComputeNode,
  type ComputeRequirements,
} from '../schema';

export class TestRuntime {
  nodes = new Map<string, ComputeImplementation>();
  graphs = new Map<string, GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>>();

  registerNode(id: string, node: ComputeImplementation) {
    this.nodes.set(id, node);
  }

  registerGraph(id: string, graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>) {
    this.graphs.set(id, graph);
  }

  runGraph(id: string, input: any): Effect.Effect<any, Error, ComputeRequirements> {
    const self = this;
    return Effect.gen(function* () {
      const graph = self.graphs.get(id) ?? raise(new Error(`Graph not found: ${id}`));
      const computation = yield* Effect.promise(() => self.compileGraph(graph));
      return yield* computation.compute!(input);
    });
  }

  async resolveNode(node: ComputeNode): Promise<ComputeImplementation> {
    if (this.nodes.has(node.type)) {
      return this.nodes.get(node.type)!;
    }

    if (this.graphs.has(node.type)) {
      const computation = await this.compileGraph(this.graphs.get(node.type)!);
      // TODO(dmaretskyi): Caching.
      return computation;
    }

    // Built-in nodes.
    switch (node.type) {
      case NodeType.Input:
        return inputNode;
      case NodeType.Output:
        return outputNode;
      case NodeType.Gpt:
        return gptNode;
    }

    throw new Error(`Unknown node type: ${node.type}`);
  }

  async compileGraph(graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>) {
    const inputNode =
      graph.getNodes({}).find((node) => node.data.type === NodeType.Input) ?? raise(new Error('Input node not found'));
    const outputNode =
      graph.getNodes({}).find((node) => node.data.type === NodeType.Output) ??
      raise(new Error('Output node not found'));
    const { computation, diagnostics } = await compile({
      graph,
      inputNodeId: inputNode.id,
      outputNodeId: outputNode.id,
      computeResolver: this.resolveNode.bind(this),
    });

    for (const { severity, message, ...rest } of diagnostics) {
      console.log(severity, message, rest);
    }
    if (diagnostics.some(({ severity }) => severity === 'error')) {
      throw new Error('Graph compilation failed');
    }

    return computation;
  }
}
