//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { raise } from '@dxos/debug';
import { DXN } from '@dxos/keys';

import { GraphExecutor } from '../compiler';
import {
  type ComputeGraphModel,
  type ComputeEffect,
  type Executable,
  type ComputeRequirements,
  type NotExecuted,
  type ValueBag,
  type ComputeNode,
} from '../types';
import { WorkflowLoader } from '../workflow';

export class TestRuntime {
  readonly nodes = new Map<string, Executable>();
  // TODO(burdon): Remove (make hierarchical?).
  readonly graphs = new Map<string, ComputeGraphModel>();

  private readonly _workflowLoader = new WorkflowLoader({
    nodeResolver: async (nodeType: string) => this.nodes.get(nodeType)!,
    graphLoader: async (graphDxn: DXN) => {
      return this.graphs.get(graphDxn.toString())!.root;
    },
  });

  registerNode(nodeType: string, node: Executable): this {
    this.nodes.set(nodeType, node);
    return this;
  }

  registerGraph(graphDxn: string, graph: ComputeGraphModel): this {
    this.graphs.set(graphDxn, graph);
    return this;
  }

  runGraph(
    graphDxn: string,
    input: ValueBag<any>,
  ): Effect.Effect<ValueBag<any>, Error | NotExecuted, ComputeRequirements> {
    return Effect.gen(this, function* () {
      const program = yield* Effect.promise(() => this._workflowLoader.load(DXN.parse(graphDxn)));
      return yield* program.run(input);
    }).pipe(Effect.withSpan('compute-graph'));
  }

  // TODO(dmaretskyi): Support cases where the are no or multiple "input" nodes.
  //                   There can be a graph which starts evaluating from constant nodes.
  async runFromInput(
    graphDxn: string,
    inputNodeId: string,
    input: ValueBag<any>,
  ): Promise<Record<string, ComputeEffect<ValueBag<any>>>> {
    const graph = this.graphs.get(graphDxn) ?? raise(new Error(`Graph not found: ${graphDxn}`));
    const workflow = await this._workflowLoader.load(DXN.parse(graphDxn));
    const executor = new GraphExecutor({
      computeNodeResolver: async (node: ComputeNode) => workflow.getStep(node.type!)!,
    });
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
