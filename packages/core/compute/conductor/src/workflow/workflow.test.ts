//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { Operation, Trace } from '@dxos/compute';
import { Feed, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-db/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { configuredCredentialsLayer } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';

import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import {
  AnyInput,
  AnyOutput,
  ComputeGraph,
  ComputeGraphModel,
  type ComputeNode,
  ComputeNodeContext,
  type ComputeResult,
  type Executable,
  ValueBag,
  synchronizedComputeFunction,
} from '../types';
import { WorkflowLoader, type WorkflowLoaderProps } from './loader';

const TestLayer = Layer.mergeAll(
  ComputeNodeContext.layerNoop,
  Layer.succeed(Operation.Service, {
    invoke: () => Effect.die('Operation.Service not available in test.'),
    schedule: () => Effect.die('Operation.Service not available in test.'),
    invokePromise: async () => ({ error: new Error('Not available') }),
  } as any),
  registryLayerNoop,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      TestAiService(),
      TestDatabaseLayer(),
      configuredCredentialsLayer([]),
      Feed.notAvailable,
      Trace.writerLayerNoop,
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
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphUri));
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
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphUri));
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
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphUri));
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
        const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphUri));
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
          const graph = createSubgraphTransform(subgraph.graphUri);
          const workflowLoader = new WorkflowLoader(createResolver(graph, subgraph));
          const workflow = yield* Effect.promise(() => workflowLoader.load(graph.graphUri));
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
          const graph = createSubgraphTransform(subgraph.graphUri);
          const workflowLoader = new WorkflowLoader(createResolver(graph));
          yield* Effect.promise(() => expect(workflowLoader.load(graph.graphUri)).rejects.toThrowError());
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
          yield* Effect.promise(() => expect(workflowLoader.load(graph.graphUri)).rejects.toThrowError());
        },
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
    );
  });

  const executeEffect = (effect: ComputeResult<any>) => {
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
    const graphUri = EID.make({ entityId: EntityId.random() });
    const model = ComputeGraphModel.create({ id: graphUri });
    const compute: [EID.EID, Transform][] = [];
    for (const [inputId, transform] of Object.entries(map)) {
      const computeNodeUri = EID.make({ entityId: EntityId.random() });
      const transformId = EntityId.random();
      compute.push([computeNodeUri, transform]);
      addTransform(model, { id: transformId, type: computeNodeUri }, { inputId, withOutput: inputId === outputPath });
    }
    const graph = Obj.make(ComputeGraph, { graph: model.graph });
    return { graphUri, graph, compute };
  };

  const createSubgraphTransform = (subgraphDxn: EID.EID): TestWorkflowGraph => {
    const graphUri = EID.make({ entityId: EntityId.random() });
    const model = ComputeGraphModel.create({ id: graphUri });
    const transformId = EntityId.random();
    addTransform(model, { id: transformId, type: subgraphDxn, subgraph: Ref.fromURI(subgraphDxn) });
    const graph = Obj.make(ComputeGraph, { graph: model.graph });
    return { graphUri, graph, compute: [] };
  };

  const createFunctionTransform = (functionRef: Ref.Ref<any> | null): TestWorkflowGraph => {
    const graphUri = EID.make({ entityId: EntityId.random() });
    const model = ComputeGraphModel.create({ id: graphUri });
    const transformId = EntityId.random();
    addTransform(model, { id: transformId, type: 'function', function: functionRef ?? undefined });
    const graph = Obj.make(ComputeGraph, { graph: model.graph });
    return { graphUri, graph, compute: [] };
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

  const createResolver = (...params: TestWorkflowGraph[]): WorkflowLoaderProps => {
    return {
      nodeResolver: async (node: ComputeNode) => {
        const transform = params.flatMap((v) => v.compute).find((v) => v[0] === node.type)?.[1];
        invariant(transform, 'Transform not found.');
        return {
          meta: { input: AnyInput, output: AnyOutput },
          exec: synchronizedComputeFunction(({ input }) => Effect.succeed({ result: transform(input) })),
        } satisfies Executable;
      },
      graphLoader: async (graphUri: string) => {
        const result = params.find((v) => v.graphUri === graphUri)?.graph;
        invariant(result, 'Graph not found.');
        return result;
      },
    };
  };
});

type Transform = (input: any) => any;

type TestWorkflowGraph = {
  graphUri: EID.EID;
  graph: ComputeGraph;
  compute: [EID.EID, Transform][];
};
