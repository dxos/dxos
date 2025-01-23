//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import { Effect, Either } from 'effect';
import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { mapValues } from '@dxos/util';

import { NODE_INPUT, NODE_OUTPUT, registry } from '../nodes';
import { logCustomEvent } from '../services';
import { TestRuntime, testServices } from '../testing';
import {
  type ComputeGraph,
  ComputeGraphModel,
  NotExecuted,
  VoidOutput,
  defineComputeNode,
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
} from '../types';

const ENABLE_LOGGING = false;

describe('Graph as a fiber runtime', () => {
  it.effect('simple adder node', ({ expect }) =>
    Effect.gen(function* () {
      const runtime = new TestRuntime()
        // Break line formatting.
        .registerNode('dxn:test:sum', sum)
        .registerGraph('dxn:test:g1', g1());

      const result = yield* runtime.runGraph('dxn:test:g1', makeValueBag({ number1: 1, number2: 2 })).pipe(
        Effect.withSpan('runGraph'),
        Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })),
        Effect.scoped,

        // Unwrapping without services to test that computing values doesn't require services.
        Effect.flatMap(unwrapValueBag),
        Effect.withSpan('test'),
      );
      expect(result).toEqual({ sum: 3 });
    }),
  );

  test('composition', async ({ expect }) => {
    const runtime = new TestRuntime()
      .registerNode('dxn:test:sum', sum)
      .registerGraph('dxn:test:g1', g1())
      .registerGraph('dxn:test:g2', g2a(DXN.parse('dxn:test:g1')));

    const result = await Effect.runPromise(
      runtime.runGraph('dxn:test:g2', makeValueBag({ a: 1, b: 2, c: 3 })).pipe(
        Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })),
        Effect.scoped,

        // Unwrapping without services to test that computing values doesn't require services.
        Effect.flatMap(unwrapValueBag),
      ),
    );
    expect(result).toEqual({ result: 6 });
  });

  // TODO(burdon): Is the DXN part of the runtime registration of the graph or persistent?
  test.skip('composition (with shortcut)', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime
      .registerNode('dxn:test:sum', sum)
      .registerGraph('dxn:test:g1', g1())
      .registerGraph('dxn:test:g2', g2b(runtime.getGraph(DXN.parse('dxn:test:g1')).root));

    const result = await Effect.runPromise(
      runtime.runGraph('dxn:test:g2', makeValueBag({ a: 1, b: 2, c: 3 })).pipe(
        Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })),
        Effect.scoped,

        // Unwrapping without services to test that computing values doesn't require services.
        Effect.flatMap(unwrapValueBag),
      ),
    );
    expect(result).toEqual({ result: 6 });
  });

  it.effect('runFromInput', ({ expect }) =>
    Effect.gen(function* () {
      const runtime = new TestRuntime()
        .registerNode('dxn:test:sum', sum)
        .registerNode('dxn:test:viewer', view)
        .registerGraph('dxn:test:g3', g3());

      const result = yield* Effect.promise(() =>
        runtime.runFromInput('dxn:test:g3', 'I', makeValueBag({ a: 1, b: 2 })),
      ).pipe(
        Effect.map((results) =>
          mapValues(results, (eff) =>
            eff.pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Effect.scoped),
          ),
        ),
      );

      const v1 = yield* unwrapValueBag(yield* result.V1);
      const v2 = yield* unwrapValueBag(yield* result.V2);
      expect(v1).toEqual({ result: 3 });
      expect(v2).toEqual({ result: 3 });
    }),
  );

  it.effect('if-else', ({ expect }) =>
    Effect.gen(function* () {
      const runtime = new TestRuntime().registerGraph('dxn:test:g4', g4()).registerNode('if', registry['if' as const]);

      const result = yield* runtime
        .runGraph('dxn:test:g4', makeValueBag({ condition: true, value: 1 }))
        .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Effect.scoped);

      expect(yield* Effect.either(result.values.true)).toEqual(Either.right(1));
      expect(yield* Effect.either(result.values.false)).toEqual(Either.left(NotExecuted));
    }),
  );
});

/**
 * Compute node.
 */
const sum = defineComputeNode({
  input: S.Struct({ a: S.Number, b: S.Number }),
  output: S.Struct({ result: S.Number }),
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
  input: S.Struct({ result: S.Number }),
  output: VoidOutput,
});

const g1 = () => {
  const model = ComputeGraphModel.create({ id: 'dxn:test:g1' });
  model.builder
    .createNode({ id: 'I', type: NODE_INPUT })
    .createNode({ id: 'X', type: 'dxn:test:sum' })
    .createNode({ id: 'O', type: NODE_OUTPUT })
    .createEdge({ node: 'I', property: 'number1' }, { node: 'X', property: 'a' })
    .createEdge({ node: 'I', property: 'number2' }, { node: 'X', property: 'b' })
    .createEdge({ node: 'X', property: 'result' }, { node: 'O', property: 'sum' });

  return model;
};

const g2a = (g1: DXN) => {
  const model = ComputeGraphModel.create({ id: 'dxn:test:g2' });
  model.builder
    .createNode({ id: 'I', type: NODE_INPUT })
    .createNode({ id: 'X', type: 'dxn:test:sum' })
    .createNode({ id: 'Y', type: 'dxn:test:sum' })
    .createNode({ id: 'O', type: NODE_OUTPUT })
    .createEdge({ node: 'I', property: 'a' }, { node: 'X', property: 'number1' })
    .createEdge({ node: 'I', property: 'b' }, { node: 'X', property: 'number2' })
    .createEdge({ node: 'I', property: 'c' }, { node: 'Y', property: 'number1' })
    .createEdge({ node: 'X', property: 'sum' }, { node: 'Y', property: 'number2' })
    .createEdge({ node: 'Y', property: 'sum' }, { node: 'O', property: 'result' });

  return model;
};

const g2b = (g1: ComputeGraph) => {
  const model = ComputeGraphModel.create({ id: 'dxn:test:g2' });
  model.builder
    .createNode({ id: 'I', type: NODE_INPUT })
    .createNode({ id: 'O', type: NODE_OUTPUT })
    .createEdge({ node: 'I', property: 'a' }, { node: g1, property: 'number1' })
    .createEdge({ node: 'I', property: 'b' }, { node: g1, property: 'number2' })
    .createEdge({ node: 'I', property: 'c' }, { node: g1, property: 'number1' })
    .createEdge({ node: 'X', property: 'sum' }, { node: g1, property: 'number2' })
    .createEdge({ node: 'Y', property: 'sum' }, { node: 'O', property: 'result' });

  return model;
};

const g3 = () => {
  const model = ComputeGraphModel.create();
  model.builder
    .createNode({ id: 'I', type: NODE_INPUT })
    .createNode({ id: 'X', type: 'dxn:test:sum' })
    .createNode({ id: 'V1', type: 'dxn:test:viewer' })
    .createNode({ id: 'V2', type: 'dxn:test:viewer' })
    .createNode({ id: 'O', type: NODE_OUTPUT })
    .createEdge({ node: 'I', property: 'a' }, { node: 'X', property: 'a' })
    .createEdge({ node: 'I', property: 'b' }, { node: 'X', property: 'b' })
    .createEdge({ node: 'X', property: 'result' }, { node: 'V1', property: 'result' })
    .createEdge({ node: 'X', property: 'result' }, { node: 'V2', property: 'result' });

  return model;
};

const g4 = () => {
  const model = ComputeGraphModel.create();
  model.builder
    .createNode({ id: 'I', type: NODE_INPUT })
    .createNode({ id: 'X', type: 'if' })
    .createNode({ id: 'O', type: NODE_OUTPUT })
    .createEdge({ node: 'I', property: 'condition' }, { node: 'X', property: 'condition' })
    .createEdge({ node: 'I', property: 'value' }, { node: 'X', property: 'value' })
    .createEdge({ node: 'X', property: 'true' }, { node: 'O', property: 'true' })
    .createEdge({ node: 'X', property: 'false' }, { node: 'O', property: 'false' });

  return model;
};
