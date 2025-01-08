//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';
import { createEdgeId, GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';

import { inputNode, outputNode } from './base-nodes';
import { compile } from './fiber-compiler';
import { defineComputeNode, NodeType, type ComputeEdge, type ComputeImplementation, type ComputeNode } from './schema';

describe('Graph as a fiber runtime', () => {
  test('simple adder node', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:adder', adder());

    // const { input, output } = await runtime.compileGraph(adder());
    // console.log('input', input.toString());
    // console.log('output', output.toString());

    const result = await Effect.runPromise(runtime.runGraph('dxn:graph:adder', { number1: 1, number2: 2 }));
    expect(result).toEqual({ sum: 3 });
  });

  test('composition', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:adder', adder());
    runtime.registerGraph('dxn:graph:add3', add3());

    try {
      const result = await Effect.runPromise(runtime.runGraph('dxn:graph:add3', { a: 1, b: 2, c: 3 }));
      expect(result).toEqual({ result: 6 });
    } catch (err) {
      log.info('err', { err });
    }
  });
});

/**
 * dxn:graph:adder
 * number1, number2 -> sum
 */
const adder = (): GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>> => {
  const graph = new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>();
  graph.addNode({
    id: 'adder-X',
    data: {
      type: NodeType.Input,
    },
  });
  graph.addEdge(createEdge({ source: 'adder-X', output: 'number1', target: 'adder-Y', input: 'a' }));
  graph.addEdge(createEdge({ source: 'adder-X', output: 'number2', target: 'adder-Y', input: 'b' }));
  graph.addNode({
    id: 'adder-Y',
    data: {
      type: 'dxn:test:add',
    },
  });
  graph.addEdge(createEdge({ source: 'adder-Y', output: 'result', target: 'adder-Z', input: 'sum' }));
  graph.addNode({
    id: 'adder-Z',
    data: {
      type: NodeType.Output,
    },
  });
  return graph;
};

/**
 * dxn:graph:add3
 * a, b, c -> result
 * Uses adder node.
 */
const add3 = (): GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>> => {
  const graph = new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>();
  graph.addNode({
    id: 'add3-X',
    data: {
      type: NodeType.Input,
    },
  });
  graph.addEdge(createEdge({ source: 'add3-X', output: 'a', target: 'add3-Y', input: 'number1' }));
  graph.addEdge(createEdge({ source: 'add3-X', output: 'b', target: 'add3-Y', input: 'number2' }));
  graph.addNode({
    id: 'add3-Y',
    data: {
      type: 'dxn:graph:adder',
    },
  });

  graph.addEdge(createEdge({ source: 'add3-X', output: 'c', target: 'add3-Z', input: 'number1' }));
  graph.addEdge(createEdge({ source: 'add3-Y', output: 'sum', target: 'add3-Z', input: 'number2' }));

  graph.addNode({
    id: 'add3-Z',
    data: {
      type: 'dxn:graph:adder',
    },
  });

  graph.addEdge(createEdge({ source: 'add3-Z', output: 'sum', target: 'add3-Zprime', input: 'result' }));

  graph.addNode({
    id: 'add3-Zprime',
    data: {
      type: NodeType.Output,
    },
  });
  return graph;
};

class TestRuntime {
  graphs = new Map<string, GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>>();

  registerGraph(id: string, graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>) {
    this.graphs.set(id, graph);
  }

  runGraph(id: string, input: any): Effect.Effect<any, Error> {
    const self = this;
    return Effect.gen(function* () {
      const graph = self.graphs.get(id) ?? raise(new Error(`Graph not found: ${id}`));
      const { computation } = yield* Effect.promise(() => self.compileGraph(graph));
      return yield* computation.compute!(input);
    });
  }

  async resolveNode(node: ComputeNode): Promise<ComputeImplementation> {
    if (this.graphs.has(node.type)) {
      const { computation: compute, diagnostics } = await this.compileGraph(this.graphs.get(node.type)!);
      for (const d of diagnostics) {
        console.log(d);
      }
      if (diagnostics.some((d) => d.severity === 'error')) {
        throw new Error('Graph compilation failed');
      }

      // TODO(dmaretskyi): Caching.
      return compute;
    }

    switch (node.type) {
      case NodeType.Input:
        return inputNode;
      case NodeType.Output:
        return outputNode;
      case 'dxn:test:add':
        return addNode;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  async compileGraph(graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>) {
    const inputNode =
      graph.getNodes({}).find((node) => node.data.type === NodeType.Input) ?? raise(new Error('Input node not found'));
    const outputNode =
      graph.getNodes({}).find((node) => node.data.type === NodeType.Output) ??
      raise(new Error('Output node not found'));
    return compile({
      graph,
      inputNodeId: inputNode.id,
      outputNodeId: outputNode.id,
      computeResolver: this.resolveNode.bind(this),
    });
  }
}

const addNode = defineComputeNode({
  input: S.Struct({ a: S.Number, b: S.Number }),
  output: S.Struct({ result: S.Number }),
  compute: (input) => Effect.succeed({ result: input.a + input.b }),
});

const createEdge = (params: {
  source: string;
  output: string;
  target: string;
  input: string;
}): GraphEdge<ComputeEdge> => ({
  id: createEdgeId({ source: params.source, target: params.target, relation: `${params.input}-${params.output}` }),
  source: params.source,
  target: params.target,
  data: { input: params.input, output: params.output },
});
