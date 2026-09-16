//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe } from 'vitest';

import { TestAiService } from '@dxos/ai/testing';
import { configuredCredentialsLayer } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { registryLayerNoop } from '@dxos/echo/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { URI } from '@dxos/keys';

import { NODE_INPUT, NODE_OUTPUT } from '../nodes/index.ts';
import { TestRuntime } from '../testing/index.ts';
import {
  type ComputeGraph,
  ComputeGraphModel,
  NotExecuted,
  ValueBag,
  VoidOutput,
  defineComputeNode,
  logCustomEvent,
  synchronizedComputeFunction,
} from '../types/index.ts';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.succeed(Operation.Service, {
        invoke: () => Effect.die('Operation.Service not available in test.'),
        schedule: () => Effect.die('Operation.Service not available in test.'),
        invokePromise: async () => ({ error: new Error('Not available') }),
      } as any),
      registryLayerNoop,
    ),
  ),
  Layer.provideMerge(
    Layer.mergeAll(TestAiService(), TestDatabaseLayer(), configuredCredentialsLayer([]), Trace.writerLayerNoop),
  ),
);

describe('Graph as a fiber runtime', () => {
  it.effect(
    'simple adder node',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime()
          // prettier-ignore
          .registerNode(URI.make('dxn:test:sum'), sum)
          .registerGraph(URI.make('dxn:test:g1'), g1());

        const result = yield* runtime.runGraph(URI.make('dxn:test:g1'), ValueBag.make({ number1: 1, number2: 2 })).pipe(
          Effect.withSpan('runGraph'),
          Effect.flatMap(ValueBag.unwrap),
          Effect.withSpan('test'), // TODO(burdon): Why span here and not in other tests?
        );
        expect(result).toEqual({ sum: 3 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'composition',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime()
          .registerNode(URI.make('dxn:test:sum'), sum)
          .registerGraph(URI.make('dxn:test:g1'), g1())
          .registerGraph(URI.make('dxn:test:g2'), g2a(URI.make('dxn:test:g1')));

        const result = yield* runtime
          .runGraph(URI.make('dxn:test:g2'), ValueBag.make({ a: 1, b: 2, c: 3 }))
          .pipe(Effect.flatMap(ValueBag.unwrap));
        expect(result).toEqual({ result: 6 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // TODO(burdon): Is the DXN part of the runtime registration of the graph or persistent?
  it.effect.skip(
    'composition (with shortcut)',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime();
        runtime
          .registerNode(URI.make('dxn:test:sum'), sum)
          .registerGraph(URI.make('dxn:test:g1'), g1())
          .registerGraph(URI.make('dxn:test:g2'), g2b(runtime.getGraph(URI.make('dxn:test:g1')).root));

        const result = yield* runtime
          .runGraph(URI.make('dxn:test:g2'), ValueBag.make({ a: 1, b: 2, c: 3 }))
          .pipe(Effect.flatMap(ValueBag.unwrap));
        expect(result).toEqual({ result: 6 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'runFromInput',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime()
          .registerNode(URI.make('dxn:test:sum'), sum)
          .registerNode(URI.make('dxn:test:viewer'), view)
          .registerGraph(URI.make('dxn:test:g3'), g3());

        const { V1, V2 } = yield* runtime.runFromInput(URI.make('dxn:test:g3'), 'I', ValueBag.make({ a: 1, b: 2 }));

        const v1 = yield* ValueBag.unwrap(V1);
        const v2 = yield* ValueBag.unwrap(V2);
        expect(v1).toEqual({ result: 3 });
        expect(v2).toEqual({ result: 3 });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'if-else',
    Effect.fnUntraced(
      function* ({ expect }) {
        const runtime = new TestRuntime().registerGraph(URI.make('dxn:test:g4'), g4());

        const result = yield* runtime.runGraph(URI.make('dxn:test:g4'), ValueBag.make({ condition: true, value: 1 }));

        expect(yield* Effect.result(result.values.true)).toEqual(Result.succeed(1));
        expect(yield* Effect.result(result.values.false)).toEqual(Result.fail(NotExecuted));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

//
// Test nodes
//

const sum = defineComputeNode({
  input: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
  output: Schema.Struct({ result: Schema.Number }),
  exec: synchronizedComputeFunction(({ a, b }) =>
    Effect.gen(function* () {
      yield* logCustomEvent({
        operation: 'sum',
        operands: { a, b },
      });

      return { result: a + b };
    }),
  ),
});

const view = defineComputeNode({
  input: Schema.Struct({ result: Schema.Number }),
  output: VoidOutput,
});

//
// Test graphs
//

const g1 = () => {
  const model = ComputeGraphModel.create({ id: URI.make('dxn:test:g1') });
  model.createNode({ id: 'I', type: NODE_INPUT });
  model.createNode({ id: 'X', type: URI.make('dxn:test:sum') });
  model.createNode({ id: 'O', type: NODE_OUTPUT });
  model.createEdge({ node: 'I', property: 'number1' }, { node: 'X', property: 'a' });
  model.createEdge({ node: 'I', property: 'number2' }, { node: 'X', property: 'b' });
  model.createEdge({ node: 'X', property: 'result' }, { node: 'O', property: 'sum' });

  return model;
};

const g2a = (g1: URI.URI) => {
  const model = ComputeGraphModel.create({ id: URI.make('dxn:test:g2') });
  model.createNode({ id: 'I', type: NODE_INPUT });
  model.createNode({ id: 'X', type: g1, subgraph: Ref.fromURI(g1) });
  model.createNode({ id: 'Y', type: g1, subgraph: Ref.fromURI(g1) });
  model.createNode({ id: 'O', type: NODE_OUTPUT });
  model.createEdge({ node: 'I', property: 'a' }, { node: 'X', property: 'number1' });
  model.createEdge({ node: 'I', property: 'b' }, { node: 'X', property: 'number2' });
  model.createEdge({ node: 'I', property: 'c' }, { node: 'Y', property: 'number1' });
  model.createEdge({ node: 'X', property: 'sum' }, { node: 'Y', property: 'number2' });
  model.createEdge({ node: 'Y', property: 'sum' }, { node: 'O', property: 'result' });

  return model;
};

const g2b = (g1: ComputeGraph) => {
  const model = ComputeGraphModel.create({ id: URI.make('dxn:test:g2') });
  model.createNode({ id: 'I', type: NODE_INPUT });
  model.createNode({ id: 'O', type: NODE_OUTPUT });
  model.createEdge({ node: 'I', property: 'a' }, { node: g1, property: 'number1' });
  model.createEdge({ node: 'I', property: 'b' }, { node: g1, property: 'number2' });
  model.createEdge({ node: 'I', property: 'c' }, { node: g1, property: 'number1' });
  model.createEdge({ node: 'X', property: 'sum' }, { node: g1, property: 'number2' });
  model.createEdge({ node: 'Y', property: 'sum' }, { node: 'O', property: 'result' });

  return model;
};

const g3 = () => {
  const model = ComputeGraphModel.create();
  model.createNode({ id: 'I', type: NODE_INPUT });
  model.createNode({ id: 'X', type: URI.make('dxn:test:sum') });
  model.createNode({ id: 'V1', type: URI.make('dxn:test:viewer') });
  model.createNode({ id: 'V2', type: URI.make('dxn:test:viewer') });
  model.createNode({ id: 'O', type: NODE_OUTPUT });
  model.createEdge({ node: 'I', property: 'a' }, { node: 'X', property: 'a' });
  model.createEdge({ node: 'I', property: 'b' }, { node: 'X', property: 'b' });
  model.createEdge({ node: 'X', property: 'result' }, { node: 'V1', property: 'result' });
  model.createEdge({ node: 'X', property: 'result' }, { node: 'V2', property: 'result' });

  return model;
};

const g4 = () => {
  const model = ComputeGraphModel.create();
  model.createNode({ id: 'I', type: NODE_INPUT });
  model.createNode({ id: 'X', type: 'if' });
  model.createNode({ id: 'O', type: NODE_OUTPUT });
  model.createEdge({ node: 'I', property: 'condition' }, { node: 'X', property: 'condition' });
  model.createEdge({ node: 'I', property: 'value' }, { node: 'X', property: 'value' });
  model.createEdge({ node: 'X', property: 'true' }, { node: 'O', property: 'true' });
  model.createEdge({ node: 'X', property: 'false' }, { node: 'O', property: 'false' });

  return model;
};
