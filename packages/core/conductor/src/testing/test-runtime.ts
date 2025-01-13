//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { raise } from '@dxos/debug';
import { type GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';

import { compile, GraphExecutor } from '../fiber-compiler';
import { inputNode, outputNode, gptNode } from '../nodes';
import {
  NodeType,
  type ComputeEdge,
  type ComputeEffect,
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
    return Effect.gen(this, function* () {
      const graph = this.graphs.get(id) ?? raise(new Error(`Graph not found: ${id}`));
      const computation = yield* Effect.promise(() => this.compileGraph(graph));
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
    // TODO(dmaretskyi): Use GraphExecutor directly.
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

  // TODO(dmaretskyi): Support cases where the are no or multiple "input" nodes.
  //                   There can be a graph which starts evaluating from constant nodes.
  async runFromInput(
    graphId: string,
    inputNodeId: string,
    input: ValueBag<any>,
  ): Promise<Record<string, ComputeEffect<ValueBag<any>>>> {
    const graph = this.graphs.get(graphId) ?? raise(new Error(`Graph not found: ${graphId}`));

    const executor = new GraphExecutor({ computeNodeResolver: this.resolveNode.bind(this) });
    await executor.load(graph);
    executor.setOutputs(inputNodeId, input);
    const dependantNodes = executor.getAllDependantNodes(inputNodeId);
    const result: Record<string, ComputeEffect<ValueBag<any>>> = {};
    for (const nodeId of dependantNodes) {
      result[nodeId] = executor.computeInputs(nodeId);
    }
    return result;
  }
}
