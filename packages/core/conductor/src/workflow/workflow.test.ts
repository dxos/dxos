//
// Copyright 2025 DXOS.org
//

import { FetchHttpClient } from '@effect/platform';
import { type Context, Effect, Layer, type Scope } from 'effect';
import { describe, test, expect } from 'vitest';

import { todo } from '@dxos/debug';
import { ObjectId, type Ref, type RefResolver, setRefResolver } from '@dxos/echo-schema';
import { DatabaseService, FunctionType, QueueService, setUserFunctionUrlInMetadata } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { live, getMeta, refFromDXN } from '@dxos/live-object';
import { LogLevel } from '@dxos/log';

import { WorkflowLoader, type WorkflowLoaderParams } from './loader';
import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import { createDxosEventLogger, EventLogger, FunctionCallService, GptService, MockGpt } from '../services';
import {
  AnyInput,
  AnyOutput,
  type ComputeEffect,
  ComputeGraph,
  ComputeGraphModel,
  type ComputeNode,
  type ComputeRequirements,
  type Executable,
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
} from '../types';

describe('workflow', () => {
  test('run', async () => {
    const graph = createSimpleTransformGraph((input) => input.num1 + input.num2);
    const workflowLoader = new WorkflowLoader(createResolver(graph));
    const workflow = await workflowLoader.load(graph.graphDxn);
    const result = await execute(workflow.run(makeInput({ num1: 2, num2: 3 })));
    expect(result).toEqual(5);
  });

  test('runFromInput', async () => {
    let sideEffect = 0;
    const graph = createGraphFromTransformMap('sum', {
      sum: (input) => input.num1 + input.num2,
      product: (input) => (sideEffect = input.num1 * input.num2),
    });
    const workflowLoader = new WorkflowLoader(createResolver(graph));
    const workflow = await workflowLoader.load(graph.graphDxn);
    const input = makeInput({ num1: 2, num2: 3 });
    expect(() => workflow.run(input)).toThrow(/.*Ambiguous workflow.*entrypoint.*/);
    expect(await execute(workflow.runFrom('sum', input))).toEqual(5);
    expect(await execute(workflow.runFrom('product', input))).toBeUndefined();
    expect(sideEffect).toEqual(6);
  });

  test('workflow without outputs is allowed', async () => {
    let sumSideEffect = 0;
    let productSideEffect = 0;
    const graph = createGraphFromTransformMap(null, {
      sum: (input) => (sumSideEffect = input.num1 + input.num2),
      product: (input) => (productSideEffect = input.num1 * input.num2),
    });
    const workflowLoader = new WorkflowLoader(createResolver(graph));
    const workflow = await workflowLoader.load(graph.graphDxn);
    const input = makeInput({ num1: 2, num2: 3 });
    expect(() => workflow.run(input)).throws();
    expect(await execute(workflow.runFrom('sum', input))).toBeUndefined();
    expect(sumSideEffect).toEqual(5);
    expect(await execute(workflow.runFrom('product', input))).toBeUndefined();
    expect(productSideEffect).toEqual(6);
  });

  test('workflow as executable', async () => {
    const graph = createSimpleTransformGraph((input) => input.num1 + input.num2);
    const workflowLoader = new WorkflowLoader(createResolver(graph));
    const workflow = await workflowLoader.load(graph.graphDxn);
    const executable = await workflow.asExecutable();
    const result = await execute(executable.exec!(makeInput({ num1: 2, num2: 3 })));
    expect(result).toEqual(5);
  });

  describe('subgraph', () => {
    test('subgraph compute', async () => {
      const subgraph = createSimpleTransformGraph((input) => input.num1 + input.num2);
      const graph = createSubgraphTransform(subgraph.graphDxn);
      const workflowLoader = new WorkflowLoader(createResolver(graph, subgraph));
      const workflow = await workflowLoader.load(graph.graphDxn);
      const result = await execute(workflow.run(makeInput({ num1: 2, num2: 3 })));
      expect(result).toEqual(5);
    });

    test('failed subgraph resolution fails loading', async () => {
      const subgraph = createSimpleTransformGraph((input) => input.num1 + input.num2);
      const graph = createSubgraphTransform(subgraph.graphDxn);
      const workflowLoader = new WorkflowLoader(createResolver(graph));
      await expect(workflowLoader.load(graph.graphDxn)).rejects.toThrowError();
    });
  });

  describe('function', () => {
    test('function resolved before execution', async () => {
      const functionUrl = 'https://test.com/foo';
      const { fnObject, functionRef, resolveCount } = createFunction();
      setUserFunctionUrlInMetadata(getMeta(fnObject), functionUrl);
      const graph = createFunctionTransform(functionRef);
      const workflowLoader = new WorkflowLoader(createResolver(graph));
      const workflow = await workflowLoader.load(graph.graphDxn);
      expect(resolveCount()).toEqual(1);

      const services = createTestExecutionContext({
        functions: {
          callFunction: async (path, { input }) => {
            expect(path).toEqual(functionUrl);
            return { result: Math.pow(input.num1, input.num2) };
          },
        },
      });

      const result = await execute(workflow.run(makeInput({ num1: 2, num2: 8 })), services);
      expect(resolveCount()).toEqual(1);
      expect(result).toEqual(256);
    });

    test('function node without function reference fails to load', async () => {
      const graph = createFunctionTransform(null);
      const workflowLoader = new WorkflowLoader(createResolver(graph));
      await expect(workflowLoader.load(graph.graphDxn)).rejects.toThrowError();
    });

    test('function without deployment reference fails to load', async () => {
      const { functionRef } = createFunction();
      const graph = createFunctionTransform(functionRef);
      const workflowLoader = new WorkflowLoader(createResolver(graph));
      await expect(workflowLoader.load(graph.graphDxn)).rejects.toThrowError();
    });

    const createFunction = () => {
      const functionDxn = DXN.fromLocalObjectId(ObjectId.random());
      const functionRef = refFromDXN(functionDxn);
      const fnObject = live(FunctionType, { name: 'foo', version: '0.0.1' });
      let resolveCounter = 0;
      const refResolver: RefResolver = {
        resolve: async (dxn) => refResolver.resolveSync(dxn, true),
        resolveSync: () => {
          resolveCounter++;
          return fnObject;
        },
        resolveSchema: () => todo(),
      };
      setRefResolver(functionRef, refResolver);
      return { fnObject, functionRef, resolveCount: () => resolveCounter };
    };
  });

  const execute = (effect: ComputeEffect<any>, services: TestEffectLayers = createTestExecutionContext()) => {
    return Effect.runPromise(
      effect.pipe(
        Effect.withSpan('runTestWorkflow'),
        Effect.flatMap(unwrapValueBag),
        Effect.provide(services),
        Effect.scoped,
      ),
    ).then((r) => r.result);
  };

  const makeInput = (input: any) => makeValueBag({ input });

  const createSimpleTransformGraph = (transform: Transform): TestWorkflowGraph => {
    return createGraphFromTransformMap('I', { I: transform });
  };

  const createGraphFromTransformMap = (
    outputPath: string | null,
    map: { [inputId: string]: Transform },
  ): TestWorkflowGraph => {
    const graphDxn = DXN.fromLocalObjectId(ObjectId.random());
    const model = ComputeGraphModel.create({ id: graphDxn.toString() });
    const compute: [DXN, Transform][] = [];
    for (const [inputId, transform] of Object.entries(map)) {
      const computeNodeDxn = DXN.fromLocalObjectId(ObjectId.random());
      const transformId = ObjectId.random();
      compute.push([computeNodeDxn, transform]);
      addTransform(
        model,
        { id: transformId, type: computeNodeDxn.toString() },
        { inputId, withOutput: inputId === outputPath },
      );
    }
    const graph = live(ComputeGraph, { graph: model.graph });
    return { graphDxn, graph, compute };
  };

  const createSubgraphTransform = (subgraphDxn: DXN): TestWorkflowGraph => {
    const graphDxn = DXN.fromLocalObjectId(ObjectId.random());
    const model = ComputeGraphModel.create({ id: graphDxn.toString() });
    const transformId = ObjectId.random();
    addTransform(model, { id: transformId, type: subgraphDxn.toString(), subgraph: refFromDXN(subgraphDxn) });
    const graph = live(ComputeGraph, { graph: model.graph });
    return { graphDxn, graph, compute: [] };
  };

  const createFunctionTransform = (functionRef: Ref<any> | null): TestWorkflowGraph => {
    const graphDxn = DXN.fromLocalObjectId(ObjectId.random());
    const model = ComputeGraphModel.create({ id: graphDxn.toString() });
    const transformId = ObjectId.random();
    addTransform(model, { id: transformId, type: 'function', function: functionRef ?? undefined });
    const graph = live(ComputeGraph, { graph: model.graph });
    return { graphDxn, graph, compute: [] };
  };

  const addTransform = (
    model: ComputeGraphModel,
    transformNode: ComputeNode,
    { inputId, withOutput }: { inputId: string; withOutput: boolean } = { inputId: 'I', withOutput: true },
  ) => {
    model.builder
      .createNode({ id: inputId, type: NODE_INPUT })
      .createNode(transformNode)
      .createEdge({ node: inputId, property: 'input' }, { node: transformNode.id, property: 'input' });
    if (withOutput) {
      model.builder
        .createNode({ id: 'O', type: NODE_OUTPUT })
        .createEdge({ node: transformNode.id, property: 'result' }, { node: 'O', property: 'result' });
    }
  };

  const createResolver = (...params: TestWorkflowGraph[]): WorkflowLoaderParams => {
    return {
      nodeResolver: async (node: ComputeNode) => {
        const transform = params.flatMap((v) => v.compute).find((v) => v[0].toString() === node.type)?.[1];
        invariant(transform, 'Transform not found.');
        return {
          meta: { input: AnyInput, output: AnyOutput },
          exec: synchronizedComputeFunction(({ input }) => Effect.succeed({ result: transform(input) })),
        } satisfies Executable;
      },
      graphLoader: async (graphDxn: DXN) => {
        const result = params.find((v) => v.graphDxn.toString() === graphDxn.toString())?.graph;
        invariant(result, 'Graph not found.');
        return result;
      },
    };
  };
});

const createTestExecutionContext = (mocks?: {
  functions?: Context.Tag.Service<FunctionCallService>;
}): TestEffectLayers => {
  const logLayer = Layer.succeed(EventLogger, createDxosEventLogger(LogLevel.INFO));
  const gptLayer = Layer.succeed(GptService, new MockGpt());
  const spaceService = DatabaseService.notAvailable;
  const queueService = QueueService.notAvailable;
  const functionCallService = Layer.succeed(FunctionCallService, mocks?.functions ?? FunctionCallService.mock());
  return Layer.mergeAll(logLayer, gptLayer, spaceService, queueService, FetchHttpClient.layer, functionCallService);
};

type TestEffectLayers = Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>>;

type Transform = (input: any) => any;

type TestWorkflowGraph = {
  graphDxn: DXN;
  graph: ComputeGraph;
  compute: [DXN, Transform][];
};
