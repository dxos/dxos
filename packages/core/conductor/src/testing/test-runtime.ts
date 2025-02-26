//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { GraphExecutor } from '../compiler';
import { type ComputeGraphModel, type ComputeEffect, type Executable, type ValueBag, type ComputeNode } from '../types';
import { WorkflowLoader } from '../workflow';

export class TestRuntime {
  // TODO(burdon): Index by DXN; ComputeGraph instances.
  private readonly _graphs = new Map<string, ComputeGraphModel>();

  private readonly _nodes = new Map<string, Executable>();

  private readonly _workflowLoader = new WorkflowLoader({
    graphLoader: async (graphDxn: DXN) => this.getGraph(graphDxn).root,
    nodeResolver: async (nodeType: string) => this._nodes.get(nodeType)!,
  });

  get graphs() {
    return this._graphs;
  }

  get nodes() {
    return this._nodes;
  }

  getGraph(graphDxn: DXN): ComputeGraphModel {
    const graph = this._graphs.get(graphDxn.toString());
    invariant(graph, `Graph not found: ${graphDxn}`);
    return graph;
  }

  // TODO(burdon): Require DXN to be set on graph.
  registerGraph(graphDxn: string, graph: ComputeGraphModel): this {
    this._graphs.set(graphDxn, graph);
    return this;
  }

  registerNode(nodeType: string, node: Executable): this {
    this._nodes.set(nodeType, node);
    return this;
  }

  runGraph(graphDxn: string, input: ValueBag<any>): ComputeEffect<ValueBag<any>> {
    return Effect.gen(this, function* () {
      const program = yield* Effect.promise(() => this._workflowLoader.load(DXN.parse(graphDxn)));
      return yield* program.run(input);
    }).pipe(Effect.withSpan('compute-graph'));
  }

  // TODO(dmaretskyi): Support cases where the are no or multiple "input" nodes.
  //  There can be a graph which starts evaluating from constant nodes.
  async runFromInput(
    graphDxn: string,
    inputNodeId: string,
    input: ValueBag<any>,
  ): Promise<Record<string, ComputeEffect<ValueBag<any>>>> {
    const workflow = await this._workflowLoader.load(DXN.parse(graphDxn));
    const executor = new GraphExecutor({
      computeNodeResolver: async (node: ComputeNode) => workflow.getResolvedNode(node.id)!,
    });

    const graph = this._graphs.get(graphDxn) ?? raise(new Error(`Graph not found: ${graphDxn}`));
    await executor.load(graph);

    executor.setOutputs(inputNodeId, Effect.succeed(input));
    const dependantNodes = executor.getAllDependantNodes(inputNodeId);
    const result: Record<string, ComputeEffect<ValueBag<any>>> = {};
    for (const nodeId of dependantNodes) {
      result[nodeId] = executor.computeInputs(nodeId);
    }

    return result;
  }
}
