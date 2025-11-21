//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { Obj, Ref } from '@dxos/echo';
import { ObjectId } from '@dxos/echo/internal';
import { TestHelpers } from '@dxos/effect';
import { ComputeEventLogger, CredentialsService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTest, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import {
  AnyInput,
  AnyOutput,
  type ComputeEffect,
  ComputeGraph,
  ComputeGraphModel,
  type ComputeNode,
  type Executable,
  ValueBag,
  synchronizedComputeFunction,
} from '../types';

import { WorkflowLoader, type WorkflowLoaderParams } from './loader';

const TestLayer = Layer.mergeAll(ComputeEventLogger.layerFromTracing).pipe(
  Layer.provideMerge(FunctionInvocationServiceLayerTest()),
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer(),
      CredentialsService.configuredLayer([]),
      TracingService.layerNoop,
    ),
  ),
);

describe('workflow', () => {
  it.scoped(
    'run',
    Effect.fnUntraced(
      function* ({ expect }) {
        const graph = createSimpleTransformGraph((input) => input.num1 + input.num2);
        const workflowLoader = new WorkflowLoader(createResolver(graph));
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphDxn));
        const result = yield* executeEffect(workflow.run(makeInput({ num1: 2, num2: 3 })));
        expect(result).toEqual(5);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'runFromInput',
    Effect.fnUntraced(
      function* ({ expect }) {
        let sideEffect = 0;
        const graph = createGraphFromTransformMap('sum', {
          sum: (input) => input.num1 + input.num2,
          product: (input) => (sideEffect = input.num1 * input.num2),
        });
        const workflowLoader = new WorkflowLoader(createResolver(graph));
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphDxn));
        const input = makeInput({ num1: 2, num2: 3 });
        expect(() => workflow.run(input)).toThrow(/.*Ambiguous workflow.*entrypoint.*/);
        expect(yield* executeEffect(workflow.runFrom('sum', input))).toEqual(5);
        expect(yield* executeEffect(workflow.runFrom('product', input))).toBeUndefined();
        expect(sideEffect).toEqual(6);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'workflow without outputs is allowed',
    Effect.fnUntraced(
      function* ({ expect }) {
        let sumSideEffect = 0;
        let productSideEffect = 0;
        const graph = createGraphFromTransformMap(null, {
          sum: (input) => (sumSideEffect = input.num1 + input.num2),
          product: (input) => (productSideEffect = input.num1 * input.num2),
        });
        const workflowLoader = new WorkflowLoader(createResolver(graph));
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphDxn));
        const input = makeInput({ num1: 2, num2: 3 });
        expect(() => workflow.run(input)).throws();
        expect(yield* executeEffect(workflow.runFrom('sum', input))).toBeUndefined();
        expect(sumSideEffect).toEqual(5);
        expect(yield* executeEffect(workflow.runFrom('product', input))).toBeUndefined();
        expect(productSideEffect).toEqual(6);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'workflow as executable',
    Effect.fnUntraced(
      function* ({ expect }) {
        const graph = createSimpleTransformGraph((input) => input.num1 + input.num2);
        const workflowLoader = new WorkflowLoader(createResolver(graph));
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphDxn));
        const executable = yield* Effect.promise(() => workflow.asExecutable());
        const result = yield* executeEffect(executable.exec!(makeInput({ num1: 2, num2: 3 })));
        expect(result).toEqual(5);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  describe('subgraph', () => {
    it.scoped(
      'subgraph compute',
      Effect.fnUntraced(
        function* ({ expect }) {
          const subgraph = createSimpleTransformGraph((input) => input.num1 + input.num2);
          const graph = createSubgraphTransform(subgraph.graphDxn);
          const workflowLoader = new WorkflowLoader(createResolver(graph, subgraph));
          const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphDxn));
          const result = yield* executeEffect(workflow.run(makeInput({ num1: 2, num2: 3 })));
          expect(result).toEqual(5);
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );

    it.scoped(
      'failed subgraph resolution fails loading',
      Effect.fnUntraced(
        function* ({ expect }) {
          const subgraph = createSimpleTransformGraph((input) => input.num1 + input.num2);
          const graph = createSubgraphTransform(subgraph.graphDxn);
          const workflowLoader = new WorkflowLoader(createResolver(graph));
          yield* Effect.promise(() => expect(workflowLoader.load(graph.graphDxn)).rejects.toThrowError());
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });

  describe('function', () => {
    it.scoped(
      'function node without function reference fails to load',
      Effect.fnUntraced(
        function* ({ expect }) {
          const graph = createFunctionTransform(null);
          const workflowLoader = new WorkflowLoader(createResolver(graph));
          yield* Effect.promise(() => expect(workflowLoader.load(graph.graphDxn)).rejects.toThrowError());
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });

  const executeEffect = (effect: ComputeEffect<any>) => {
    return effect.pipe(
      Effect.withSpan('runTestWorkflow'),
      Effect.flatMap(ValueBag.unwrap),
      Effect.map((r) => r.result),
    );
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

type Transform = (input: any) => any;

type TestWorkflowGraph = {
  graphDxn: DXN;
  graph: ComputeGraph;
  compute: [DXN, Transform][];
};
