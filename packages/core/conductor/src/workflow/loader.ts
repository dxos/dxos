//
// Copyright 2025 DXOS.org
//

import { toEffectSchema } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { Effect } from 'effect';

import { type ComputeResolver, GraphExecutor, compileOrThrow } from '../compiler';
import { NODE_INPUT, NODE_OUTPUT, type NodeType, inputNode, outputNode, registry } from '../nodes';
import {
  AnyInput,
  AnyOutput,
  type ComputeGraph,
  ComputeGraphModel,
  type ComputeNode,
  type Executable,
  synchronizedComputeFunction,
} from '../types';

import { Workflow } from './workflow';
import { FunctionInvocationService, FunctionDefinition } from '@dxos/functions';

export type WorkflowLoaderParams = {
  nodeResolver: (node: ComputeNode) => Promise<Executable>;
  graphLoader: (graphId: DXN) => Promise<ComputeGraph>;
};

/**
 * Recursively loads ComputeGraph object to assemble a ComputeGraphModel.
 */
export class WorkflowLoader {
  private readonly _nodeResolver: (node: ComputeNode) => Promise<Executable>;
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

  private _createComputeResolver(cache: CompilationCache = newCompilationCache()): {
    resolver: ComputeResolver;
    resolvedNodes: Map<string, Executable>;
  } {
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
            executable = await this._compileGraph(node.type, graph, cache);
          } else if (node.type === 'function' || node.function) {
            executable = await this._loadFunction(node, cache);
          } else if (registry[node.type as NodeType]) {
            executable = registry[node.type as NodeType];
          } else {
            executable = await this._nodeResolver(node);
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
    cache: CompilationCache,
  ): Promise<Executable> {
    const compiled = cache.compiledGraphMap.get(graphDxnStr);
    if (compiled) {
      return compiled;
    }

    if (cache.compilationInProgress.has(graphDxnStr)) {
      throw new Error(`Circular dependency found at ${graphDxnStr}.`);
    }
    cache.compilationInProgress.add(graphDxnStr);

    const { inputNodeId, outputNodeId } = this._resolveSubgraphInOut(graph);
    const { resolver: computeResolver } = this._createComputeResolver(cache);
    const executable = await compileOrThrow({
      graph,
      inputNodeId,
      outputNodeId,
      computeResolver,
    });

    cache.compiledGraphMap.set(graphDxnStr, executable);
    return executable;
  }

  private async _loadFunction(node: ComputeNode, cache: CompilationCache): Promise<Executable> {
    const functionRef = node.function;
    if (node.type !== 'function' || !functionRef) {
      throw new Error(`Function reference missing on node ${node.id}.`);
    }

    const cacheKey = functionRef.dxn.toString();
    const cached = cache.loadedFunctionsMap.get(cacheKey);
    if (cached) {
      return cached;
    }

    const funcionDef = FunctionDefinition.deserialize(await functionRef.load());
    const output = node.outputSchema ? toEffectSchema(node.outputSchema) : AnyOutput;
    const result: Executable = {
      meta: { input: node.inputSchema ? toEffectSchema(node.inputSchema) : AnyInput, output },
      exec: synchronizedComputeFunction(
        Effect.fnUntraced(function* (input) {
          return yield* FunctionInvocationService.invokeFunction(funcionDef, input);
        }),
      ),
    };

    cache.loadedFunctionsMap.set(cacheKey, result);

    return result;
  }

  private _validateWorkflowInOut(graph: ComputeGraphModel): void {
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

const newCompilationCache = (): CompilationCache => ({
  loadedFunctionsMap: new Map<string, Executable>(),
  compiledGraphMap: new Map<string, Executable>(),
  compilationInProgress: new Set<string>(),
});

type CompilationCache = {
  loadedFunctionsMap: Map<string, Executable>;
  compiledGraphMap: Map<string, Executable>;
  compilationInProgress: Set<string>;
};
