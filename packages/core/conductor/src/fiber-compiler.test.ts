import { describe, test } from 'vitest';
import { createEdgeId, Graph, GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';
import { defineComputeNode, NodeType, type ComputeEdge, type ComputeImplementation, type ComputeNode } from './schema';
import { compile } from './fiber-compiler';
import { S } from '@dxos/echo-schema';
import { Effect } from 'effect';
import { inputNode, outputNode } from './base-nodes';
import type { number } from 'effect/Equivalence';

describe('Graph as a fiber runtime', async () => {
  test('simple adder node', async ({ expect }) => {
    const graph = new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>();
    graph.addNode({
      id: 'X',
      data: {
        type: NodeType.Input,
      },
    });
    graph.addEdge(createEdge({ source: 'X', output: 'number1', target: 'Y', input: 'a' }));
    graph.addEdge(createEdge({ source: 'X', output: 'number2', target: 'Y', input: 'b' }));
    graph.addNode({
      id: 'Y',
      data: {
        type: 'dxn:test:add',
      },
    });
    graph.addEdge(createEdge({ source: 'Y', output: 'result', target: 'Z', input: 'sum' }));
    graph.addNode({
      id: 'Z',
      data: {
        type: NodeType.Output,
      },
    });

    const computation = await compile({ graph, inputNodeId: 'X', outputNodeId: 'Z', computeResolver: testResolver });

    console.log(computation.input.toString());
    console.log(computation.output.toString());

    const result = await Effect.runPromise(computation.compute!({ number1: 1, number2: 2 }));
    console.log(result);
    expect(result).toEqual({ sum: 3 });
  });
});

const addNode = defineComputeNode({
  input: S.Struct({ a: S.Number, b: S.Number }),
  output: S.Struct({ result: S.Number }),
  compute: (input) => Effect.succeed({ result: input.a + input.b }),
});

const testResolver = async (node: ComputeNode): Promise<ComputeImplementation> => {
  switch (node.type) {
    case NodeType.Input:
      return inputNode;
    case NodeType.Output:
      return outputNode;
    case 'dxn:test:add':
      return addNode;
    default:
      return Promise.resolve(addNode);
  }
};

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
