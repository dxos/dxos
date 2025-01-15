//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { nonNullable } from '@dxos/util';

import { Workflow } from './workflow';
import { compile } from '../compiler';
import type { GraphDiagnostic } from '../compiler/topology';
import { gptNode, inputNode, outputNode } from '../nodes';
import { type ComputeGraph, ComputeGraphModel, type Executable, NodeType } from '../types';

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
    const graphMap = await this._loadRecursive(graphDxn);
    const compiledGraphMap = await this._compileAll(graphMap);
    const result = compiledGraphMap.get(graphDxn.toString());
    invariant(result, 'The main workflow was not compiled.');
    return result;
  }

  private async _compileAll(graphMap: Map<string, ComputeGraphModel>): Promise<Map<string, Workflow>> {
    const compiledWorkflows = new Map<string, Workflow>();
    for (const [graphDxn, graph] of graphMap.entries()) {
      await this._compileGraph(graphDxn, graph, graphMap, compiledWorkflows);
    }
    return compiledWorkflows;
  }

  private async _compileGraph(
    graphDxnStr: string,
    graph: ComputeGraphModel,
    graphMap: Map<string, ComputeGraphModel>,
    compiledGraphMap: Map<string, Workflow>,
    compilationInProgress: Set<string> = new Set(),
  ): Promise<Workflow> {
    const compiled = compiledGraphMap.get(graphDxnStr);
    if (compiled) {
      return compiled;
    }

    if (compilationInProgress.has(graphDxnStr)) {
      throw new Error(`Circular dependency found at ${graphDxnStr}.`);
    }
    compilationInProgress.add(graphDxnStr);

    const graphDxn = DXN.parse(graphDxnStr);

    const resolvedNodes = new Map<string, Executable>();
    const { inputNodeId, outputNodeId } = this._resolveInOut(graph);
    const compilationResult = await compile({
      graph,
      inputNodeId,
      outputNodeId,
      computeResolver: async (node) => {
        invariant(node.type, 'Node must have a type.');

        let executable: Executable;
        switch (node.type) {
          case NodeType.Input:
            executable = inputNode;
            break;
          case NodeType.Output:
            executable = outputNode;
            break;
          case NodeType.Gpt:
            executable = gptNode;
            break;
          default: {
            const graphModel = graphMap.get(node.type);
            if (graphModel) {
              const subgraph = await this._compileGraph(
                node.type,
                graphModel,
                graphMap,
                compiledGraphMap,
                compilationInProgress,
              );
              executable = subgraph.asExecutable();
            } else {
              executable = await this._nodeResolver(node.type);
            }
            break;
          }
        }

        resolvedNodes.set(node.type, executable);
        return executable;
      },
    });

    if (compilationResult.diagnostics.length) {
      throw new Error(`Graph compilation failed:\n${formatDiagnostics(compilationResult.diagnostics)}`);
    }

    const workflow = new Workflow(graphDxn, compilationResult.executable, resolvedNodes);
    compiledGraphMap.set(graphDxnStr, workflow);
    return workflow;
  }

  private async _loadRecursive(
    graphDxn: DXN,
    outputMap: Map<string, ComputeGraphModel> = new Map(),
  ): Promise<Map<string, ComputeGraphModel>> {
    const dxnString = graphDxn.toString();
    if (outputMap.has(dxnString)) {
      return outputMap;
    }

    const graph = new ComputeGraphModel(await this._graphLoader(graphDxn));
    outputMap.set(dxnString, graph);
    for (const node of graph.nodes) {
      if (node.data.subgraph) {
        await this._loadRecursive(node.data.subgraph.dxn, outputMap);
      }
    }

    return outputMap;
  }

  private _resolveInOut(graph: ComputeGraphModel): { inputNodeId: string; outputNodeId: string } {
    const inputNodes = graph.nodes.filter((node) => node.data.type === NodeType.Input);
    invariant(inputNodes.length === 1, 'Graph must have a single input.');
    const outputNodes = graph.nodes.filter((node) => node.data.type === NodeType.Output);
    invariant(outputNodes.length === 1, 'Graph must have a single output.');
    return { inputNodeId: inputNodes[0].id, outputNodeId: outputNodes[0].id };
  }
}

const formatDiagnostics = (diagnostic: GraphDiagnostic[]): string => {
  return diagnostic
    .map((d) => {
      const objects = [d.nodeId && `Node(${d.nodeId})`, d.edgeId && `Edge(${d.edgeId})`].filter(nonNullable).join(' ,');
      return `${d.severity}: ${d.message}${objects ? `. ${objects}.` : ''} `;
    })
    .join('\n');
};
