import type { Graph, GraphEdge, GraphModel, GraphNode } from '@dxos/graph';
import type { ComputeCallback, ComputeEdge, ComputeImplementation } from './schema';
import type { ComputeNode } from './schema';
import { Cause, Effect } from 'effect';
import { raise } from '../../../common/debug/src';
import { effect } from 'effect/Layer';
import { AST, S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { pickProperty } from './ast';

export type CompileParams = {
  graph: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;

  /**
   * Id of the entrypoint node.
   */
  inputNodeId: string;

  /**
   * Id of the output node.
   */
  outputNodeId: string;

  computeResolver: (node: ComputeNode) => Promise<ComputeImplementation>;
};

/**
 * @returns A new compute implementation that takes input from the specific entrypoint node and returns the output from the specific output node computing all intermediate nodes.
 */
export const compile = async ({
  graph,
  inputNodeId,
  outputNodeId,
  computeResolver,
}: CompileParams): Promise<ComputeImplementation> => {
  const getInputType = async (nodeId: string, input: string): Promise<S.Schema.AnyNoContext> => {
    const spec = await computeResolver(graph.getNode(nodeId)!.data);
    return pickProperty(spec.input, input);
  };

  const getOutputType = async (nodeId: string, output: string): Promise<S.Schema.AnyNoContext> => {
    const spec = await computeResolver(graph.getNode(nodeId)!.data);
    return pickProperty(spec.output, output);
  };

  // Validate graph
  {
    const edges = graph.getEdges({});
    for (const edge of edges) {
      const outputType = await getOutputType(edge.source, edge.data.output);
      const inputType = await getInputType(edge.target, edge.data.input);

      if (AST.isNeverKeyword(outputType.ast)) {
        throw new Error(`Invalid output: ${edge.data.output} on node ${edge.source}`);
      }
      if (AST.isNeverKeyword(inputType.ast)) {
        throw new Error(`Invalid input: ${edge.data.input} on node ${edge.target}`);
      }
    }
  }

  const inputNode = graph.getNode(inputNodeId) ?? raise(new Error(`Input node not found`));
  const outputNode = graph.getNode(outputNodeId) ?? raise(new Error(`Output node not found`));

  // log.info('inputEdges', { inputNodeId, edges: graph.getEdges({ source: inputNodeId }) });

  const inputNodeSchema = S.Struct(
    Object.fromEntries(
      await Promise.all(
        graph
          .getEdges({ source: inputNodeId })
          .map(async (edge) => [edge.data.output, await getInputType(edge.target, edge.data.input)] as const),
      ),
    ),
  );

  // log.info('inputSchema', { inputSchema: inputNodeSchema.toString() });

  const outputNodeSchema = S.Struct(
    Object.fromEntries(
      await Promise.all(
        graph
          .getEdges({ target: outputNodeId })
          .map(async (edge) => [edge.data.input, await getOutputType(edge.source, edge.data.output)] as const),
      ),
    ),
  );

  const computeCache = new Map<string, Effect.Effect<any, any>>();

  const computeInputs = (nodeId: string): Effect.Effect<any, Error> => {
    return Effect.gen(function* () {
      const inputEdges = graph.getEdges({ target: nodeId });

      const inputValues = yield* Effect.forEach(inputEdges, (edge) =>
        computeNode(edge.source).pipe(Effect.map((value) => [edge.data.input, value[edge.data.output]] as const)),
      ).pipe(Effect.map((inputs) => Object.fromEntries(inputs)));

      return inputValues;
    });
  };

  const computeNode = (nodeId: string): Effect.Effect<any, any> => {
    if (computeCache.has(nodeId)) {
      return computeCache.get(nodeId)!;
    }

    const result = Effect.gen(function* () {
      const inputValues = yield* computeInputs(nodeId);

      const node = graph.getNode(nodeId) ?? raise(new Error(`Node not found: ${nodeId}`));
      const nodeSpec = yield* Effect.promise(() => computeResolver(node.data));
      if (nodeSpec.compute == null) {
        yield* Effect.fail(new Error(`No compute function for node type: ${node.data.type}`));
        return;
      }

      log.info('begin compute', { nodeId, type: node.data.type, inputValues, inputSchema: nodeSpec.input.toString() });

      const sanitizedInputs = yield* S.decode(nodeSpec.input)(inputValues).pipe(
        Effect.mapErrorCause((cause) =>
          Cause.sequential(cause, Cause.fail(`While sanitizing node inputs: ${node.data.type}`)),
        ),
      );
      const output = yield* nodeSpec.compute(sanitizedInputs);
      const decodedOutput = yield* S.decode(nodeSpec.output)(output);
      log.info('compute result', { nodeId, type: node.data.type, output: decodedOutput });
      return decodedOutput;
    });

    computeCache.set(nodeId, result);
    return result;
  };

  return {
    input: inputNodeSchema,
    output: outputNodeSchema,

    compute: (input) => {
      computeCache.set(inputNode.id, Effect.succeed(input));
      return computeInputs(outputNode.id);
    },
  };
};
