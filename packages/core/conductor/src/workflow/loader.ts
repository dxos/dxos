//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';

import { Workflow } from './workflow';
import { compileOrThrow, type ComputeResolver, GraphExecutor } from '../compiler';
import { inputNode, NODE_INPUT, NODE_OUTPUT, type NodeType, outputNode, registry } from '../nodes';
import { type ComputeGraph, ComputeGraphModel, type Executable } from '../types';

type WorkflowLoaderParams = {
  nodeResolver: (nodeType: string) => Promise<Executable>;
  graphLoader: (graphId: DXN) => Promise<ComputeGraph>;
};

/**
 * Recursively loads ComputeGraph object to assemble a ComputeGraphModel.
 */
export class WorkflowLoader {
  private readonly _nodeResolver: (nodeType: string) => Promise<Executable>;
  private readonly _graphLoader: (graphId: DXN) => Promise<ComputeGraph>;

  constructor(params: WorkflowLoaderParams) {
    this._nodeResolver = params.nodeResolver;
    this._graphLoader = params.graphLoader;
  }

  public async load(graphDxn: DXN): Promise<Workflow> {
    const graph = new ComputeGraphModel(await this._graphLoader(graphDxn));

    this._validateWorkflowInOut(graph);

    const { resolver, resolvedNodes } = this._createComputeResolver();
    const executor = new GraphExecutor({ computeNodeResolver: resolver });
    await executor.load(graph);
    return new Workflow(graphDxn, graph, executor, resolvedNodes);
  }

  private _createComputeResolver(
    compiledGraphMap: Map<string, Executable> = new Map(),
    compilationInProgress: Set<string> = new Set(),
  ): { resolver: ComputeResolver; resolvedNodes: Map<string, Executable> } {
    const resolvedNodes = new Map();
    const resolver: ComputeResolver = async (node) => {
      invariant(node.type, 'Node must have a type.');
      const resolved = resolvedNodes.get(node.id);
      if (resolved) {
        return resolved;
      }

      let executable: Executable;
      switch (node.type) {
        case NODE_INPUT:
          executable = inputNode;
          break;
        case NODE_OUTPUT:
          executable = outputNode;
          break;
        default: {
          if (node.subgraph) {
            const graph = new ComputeGraphModel(await this._graphLoader(node.subgraph.dxn));
            executable = await this._compileGraph(node.type, graph, compiledGraphMap, compilationInProgress);
          } else if (registry[node.type as NodeType]) {
            executable = registry[node.type as NodeType];
          } else {
            executable = await this._nodeResolver(node.type);
          }
          break;
        }
      }

      resolvedNodes.set(node.id, executable);

      return executable;
    };
    return { resolver, resolvedNodes };
  }

  private async _compileGraph(
    graphDxnStr: string,
    graph: ComputeGraphModel,
    compiledGraphMap: Map<string, Executable>,
    compilationInProgress: Set<string> = new Set(),
  ): Promise<Executable> {
    const compiled = compiledGraphMap.get(graphDxnStr);
    if (compiled) {
      return compiled;
    }

    if (compilationInProgress.has(graphDxnStr)) {
      throw new Error(`Circular dependency found at ${graphDxnStr}.`);
    }
    compilationInProgress.add(graphDxnStr);

    const { inputNodeId, outputNodeId } = this._resolveSubgraphInOut(graph);
    const { resolver: computeResolver } = this._createComputeResolver(compiledGraphMap, compilationInProgress);
    const executable = await compileOrThrow({
      graph,
      inputNodeId,
      outputNodeId,
      computeResolver,
    });

    compiledGraphMap.set(graphDxnStr, executable);
    return executable;
  }

  private _validateWorkflowInOut(graph: ComputeGraphModel) {
    const inputNodes = graph.nodes.filter((node) => node.type === NODE_INPUT);
    invariant(inputNodes.length > 0, 'Workflow must have at least one input node.');
    const outputNodes = graph.nodes.filter((node) => node.type === NODE_OUTPUT);
    invariant(outputNodes.length <= 1, 'Workflow must have at most one output node.');
  }

  private _resolveSubgraphInOut(graph: ComputeGraphModel): { inputNodeId: string; outputNodeId: string } {
    const inputNodes = graph.nodes.filter((node) => node.type === NODE_INPUT);
    invariant(inputNodes.length === 1, 'Subgraph must have a single input.');
    const outputNodes = graph.nodes.filter((node) => node.type === NODE_OUTPUT);
    invariant(outputNodes.length === 1, 'Subgraph must have a single output.');
    return { inputNodeId: inputNodes[0].id, outputNodeId: outputNodes[0].id };
  }
}
