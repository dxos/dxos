//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { refFromDXN } from '@dxos/live-object';
import { mapValues } from '@dxos/util';

import { logCustomEvent } from '../services';
import { createEdge, TestRuntime, testServices } from '../testing';
import {
  ComputeGraphModel,
  NodeType,
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
        //
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

  test.only('composition', async ({ expect }) => {
    const runtime = new TestRuntime()
      .registerNode('dxn:test:sum', sum)
      .registerGraph('dxn:test:g1', g1())
      .registerGraph('dxn:test:g2', g2());

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
        //
        .registerNode('dxn:test:sum', sum)
        .registerNode('dxn:test:viewer', viewer)
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

/**
 * Viewer node.
 */
const viewer = defineComputeNode({
  input: S.Struct({ result: S.Number }),
  output: S.Struct({}),
});

/**
 * dxn:compute:g1
 * number1, number2 -> sum
 */
const g1 = () => {
  return ComputeGraphModel.create()
    .addNode({ id: 'I', data: { type: NodeType.Input } })
    .addNode({ id: 'X', data: { type: 'dxn:test:sum' } })
    .addNode({ id: 'O', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'I', output: 'number1', target: 'X', input: 'a' }))
    .addEdge(createEdge({ source: 'I', output: 'number2', target: 'X', input: 'b' }))
    .addEdge(createEdge({ source: 'X', output: 'result', target: 'O', input: 'sum' }));
};

/**
 * dxn:compute:g2
 * a, b, c -> result
 * Uses adder node.
 */
const g2 = () => {
  const g1Dxn = DXN.parse('dxn:test:g1');
  return ComputeGraphModel.create()
    .addNode({ id: 'I', data: { type: NodeType.Input } })
    .addNode({ id: 'X', data: { type: g1Dxn.toString(), subgraph: refFromDXN(g1Dxn) } })
    .addNode({ id: 'Y', data: { type: g1Dxn.toString(), subgraph: refFromDXN(g1Dxn) } })
    .addNode({ id: 'O', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'I', output: 'a', target: 'X', input: 'number1' }))
    .addEdge(createEdge({ source: 'I', output: 'b', target: 'X', input: 'number2' }))
    .addEdge(createEdge({ source: 'I', output: 'c', target: 'Y', input: 'number1' }))
    .addEdge(createEdge({ source: 'X', output: 'sum', target: 'Y', input: 'number2' }))
    .addEdge(createEdge({ source: 'Y', output: 'sum', target: 'O', input: 'result' }));
};

// Branching computations.
const g3 = () => {
  return ComputeGraphModel.create()
    .addNode({ id: 'I', data: { type: NodeType.Input } })
    .addNode({ id: 'X', data: { type: 'dxn:test:sum' } })
    .addNode({ id: 'V1', data: { type: 'dxn:test:viewer' } })
    .addNode({ id: 'V2', data: { type: 'dxn:test:viewer' } })
    .addNode({ id: 'O', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'I', output: 'a', target: 'X', input: 'a' }))
    .addEdge(createEdge({ source: 'I', output: 'b', target: 'X', input: 'b' }))
    .addEdge(createEdge({ source: 'X', output: 'result', target: 'V1', input: 'result' }))
    .addEdge(createEdge({ source: 'X', output: 'result', target: 'V2', input: 'result' }));
};

/*

interface Node<I, O> {
  compute(input: I): Promise<O>;
}

type Input<T> = { node?: Node<any, T> | string; prop: keyof T };
type Output<T> = { node?: Node<T, any> | string; prop: keyof T };

interface Graph<I, O> extends Node<I, O> {
  add(id: string): this;
  link(source: Input<I>, target: Output<O>): this;
}

const g: Graph<any, any> = {};

g.add('A')
  .add('B')
  .link({ prop: 'a' }, { node: 'A', prop: 'input' })
  .link({ node: 'A', prop: 'output' }, { node: 'B', prop: 'input' })
  .link({ node: 'B', prop: 'output' }, { prop: 'b' });

namespace OnDisk {
  type ObjectId = string;

  type Node = {
    id: ObjectId;
    type: string;
  };

  type Edge = {
    source: { node: ObjectId | 'self'; prop: string };
    target: { node: ObjectId | 'self'; prop: string };
  };

  type Graph = {
    nodes: Node[];
    edges: Edge[];
  };

  const graph: Graph = {
    nodes: [
      { id: 'A', type: 'dxn:compute:sum' },
      { id: 'B', type: 'dxn:compute:sum' },
    ],
    edges: [
      { source: { node: 'self', prop: 'output' }, target: { node: 'A', prop: 'input' } },
      { source: { node: 'A', prop: 'output' }, target: { node: 'B', prop: 'input' } },
      { source: { node: 'B', prop: 'output' }, target: { node: 'self', prop: 'b' } },
    ],
  };
}

const x1 = [
  {
    id: 'a',
    nodes: [
      {
        id: 'a',
      },
    ],
    edges: [
      {
        source: { prop: 'a' },
        target: { prop: 'input', node: 'a' },
      },
      {
        source: { prop: 'output', node: 'a' },
        target: { prop: 'b' },
      },
    ],
  },
];

const x2 = [
  {
    id: 'a',
    nodes: [
      {
        id: '1',
        kind: 'input',
      },
      {
        id: '2',
        kind: 'normal',
        type: 'dxn:graph:gpt',
      },
      {
        id: '3',
        kind: 'output',
      },
    ],
    edges: [
      {
        source: { prop: 'a', node: 'input' },
        target: { prop: 'input', node: 'a' },
      },
      {
        source: { prop: 'output', node: 'a' },
        target: { prop: 'b', node: 'output' },
      },
    ],
  },
];

*/
