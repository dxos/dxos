//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { raise } from '@dxos/debug';
import { type GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';

import { compile } from '../fiber-compiler';
import { inputNode, outputNode, gptNode } from '../nodes';
import {
  NodeType,
  type ComputeEdge,
  type ComputeImplementation,
  type ComputeNode,
  type ComputeRequirements,
  type NotExecuted,
  type ValueBag,
} from '../schema';
import type { Value } from 'effect/FastCheck';

export class TestRuntime {
  nodes = new Map<string, ComputeImplementation>();
  graphs = new Map<string, GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>>();

  registerNode(id: string, node: ComputeImplementation): this {
    this.nodes.set(id, node);
    return this;
  }

  registerGraph(id: string, graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>): this {
    this.graphs.set(id, graph);
    return this;
  }

  runGraph(id: string, input: ValueBag<any>): Effect.Effect<ValueBag<any>, Error | NotExecuted, ComputeRequirements> {
    const self = this;
    return Effect.gen(function* () {
      const graph = self.graphs.get(id) ?? raise(new Error(`Graph not found: ${id}`));
      const computation = yield* Effect.promise(() => self.compileGraph(graph));
      return yield* computation.compute!(input);
    }).pipe(Effect.withSpan('compute-graph'));
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

  async compileGraph(graph: GraphModel<GraphNode<ComputeNode, false>, GraphEdge<ComputeEdge, false>>) {
    const inputNode =
      graph.nodes.find((node) => node.data.type === NodeType.Input) ?? raise(new Error('Input node not found'));
    const outputNode =
      graph.nodes.find((node) => node.data.type === NodeType.Output) ?? raise(new Error('Output node not found'));
    const { computation, diagnostics } = await compile({
      graph,
      inputNodeId: inputNode.id,
      outputNodeId: outputNode.id,
      computeResolver: this.resolveNode.bind(this),
    });

    // for (const { severity, message, ...rest } of diagnostics) {
    //   console.log(severity, message, rest);
    // }
    if (diagnostics.some(({ severity }) => severity === 'error')) {
      throw new Error('Graph compilation failed');
    }

    return computation;
  }
}
