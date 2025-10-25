//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import { describe, expect, test } from 'vitest';

import { todo } from '@dxos/debug';
import { DXN, Obj, Ref } from '@dxos/echo';
import { ObjectId, type RefResolver, setRefResolver } from '@dxos/echo/internal';
import { Function, ServiceContainer, setUserFunctionIdInMetadata } from '@dxos/functions';
import { type RemoteFunctionExecutionService, createEventLogger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { LogLevel } from '@dxos/log';

import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import {
  AnyInput,
  AnyOutput,
  type ComputeEffect,
  ComputeGraph,
  ComputeGraphModel,
  type ComputeNode,
  type ComputeRequirements,
  type Executable,
  ValueBag,
  synchronizedComputeFunction,
} from '../types';

import { WorkflowLoader, type WorkflowLoaderParams } from './loader';

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
      const functionId = '1234';
      const { fnObject, functionRef, resolveCount } = createFunction();
      setUserFunctionIdInMetadata(Obj.getMeta(fnObject), functionId);
      const graph = createFunctionTransform(functionRef);
      const workflowLoader = new WorkflowLoader(createResolver(graph));
      const workflow = await workflowLoader.load(graph.graphDxn);
      expect(resolveCount()).toEqual(1);

      const services = createTestExecutionContext({
        functions: {
          callFunction: (deployedFunctionId, { input }: any) =>
            Effect.sync(() => {
              expect(deployedFunctionId).toEqual(`/${functionId}`);
              return { result: Math.pow(input.num1, input.num2) } as any;
            }),
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
      const functionRef = Ref.fromDXN(functionDxn);
      const fnObject = Function.make({ name: 'foo', version: '0.0.1' });
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
        Effect.flatMap(ValueBag.unwrap),
        Effect.provide(services),
        Effect.scoped,
      ),
    ).then((r) => r.result);
  };

  const makeInput = (input: any) => ValueBag.make({ input });

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
    const graph = Obj.make(ComputeGraph, { graph: model.graph });
    return { graphDxn, graph, compute };
  };

  const createSubgraphTransform = (subgraphDxn: DXN): TestWorkflowGraph => {
    const graphDxn = DXN.fromLocalObjectId(ObjectId.random());
    const model = ComputeGraphModel.create({ id: graphDxn.toString() });
    const transformId = ObjectId.random();
    addTransform(model, { id: transformId, type: subgraphDxn.toString(), subgraph: Ref.fromDXN(subgraphDxn) });
    const graph = Obj.make(ComputeGraph, { graph: model.graph });
    return { graphDxn, graph, compute: [] };
  };

  const createFunctionTransform = (functionRef: Ref.Ref<any> | null): TestWorkflowGraph => {
    const graphDxn = DXN.fromLocalObjectId(ObjectId.random());
    const model = ComputeGraphModel.create({ id: graphDxn.toString() });
    const transformId = ObjectId.random();
    addTransform(model, { id: transformId, type: 'function', function: functionRef ?? undefined });
    const graph = Obj.make(ComputeGraph, { graph: model.graph });
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
  functions?: Context.Tag.Service<RemoteFunctionExecutionService>;
}): TestEffectLayers => {
  return new ServiceContainer()
    .setServices({
      eventLogger: createEventLogger(LogLevel.INFO),
      functionCallService: mocks?.functions,
    })
    .createLayer();
};

type TestEffectLayers = Layer.Layer<Exclude<ComputeRequirements, Scope.Scope>>;

type Transform = (input: any) => any;

type TestWorkflowGraph = {
  graphDxn: DXN;
  graph: ComputeGraph;
  compute: [DXN, Transform][];
};
