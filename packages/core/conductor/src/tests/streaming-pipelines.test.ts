//
// Copyright 2025 DXOS.org
//

import { Effect, Stream } from 'effect';
import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';
import { GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';

import { createEdge } from '../model';
import { TestRuntime, testServices } from '../testing';
import {
  defineComputeNode,
  makeValueBag,
  synchronizedComputeFunction,
  unwrapValueBag,
  type ComputeEdge,
  type ComputeGraph,
  type ComputeNode,
  NodeType,
} from '../types';
import { StreamSchema } from '../util';

const ENABLE_LOGGING = false;

describe('Streaming pipelines', () => {
  test('synchronous stream sum pipeline', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerNode('dxn:test:sum-aggregator', sumAggregator);
    runtime.registerGraph('dxn:compute:stream-sum', streamSum());

    const { result } = await Effect.runPromise(
      runtime
        .runGraph('dxn:compute:stream-sum', makeValueBag({ stream: Effect.succeed(Stream.range(1, 10)) }))
        .pipe(
          Effect.flatMap(unwrapValueBag),
          Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })),
          Effect.scoped,
        ),
    );

    expect(result).toEqual(55);
  });

  test('asynchronous stream sum pipeline', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerNode('dxn:test:sum-aggregator', sumAggregator);
    runtime.registerGraph('dxn:compute:stream-sum', streamSum());

    const delayedStream = Stream.range(1, 10).pipe(
      Stream.mapEffect((n) => Effect.succeed(n).pipe(Effect.delay('50 millis'))),
    );

    const { result } = await Effect.runPromise(
      runtime
        .runGraph('dxn:compute:stream-sum', makeValueBag({ stream: Effect.succeed(delayedStream) }))
        .pipe(
          Effect.flatMap(unwrapValueBag),
          Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })),
          Effect.scoped,
        ),
    );

    expect(result).toEqual(55);
  });
});

/**
 * dxn:test:sum-aggregator
 */
// TODO(dmaretskyi): Can we generalize this to work over arrays and streams?
//                   Maybe nodes can have signature overloads.
const sumAggregator = defineComputeNode({
  input: S.Struct({ stream: StreamSchema(S.Number) }),
  output: S.Struct({ result: S.Number }),
  exec: synchronizedComputeFunction(({ stream }) =>
    Effect.gen(function* () {
      const result = yield* stream.pipe(Stream.runFold(0, (acc, x) => acc + x));
      return { result };
    }),
  ),
});

/**
 * dxn:compute:stream-sum
 * stream -> result
 * Sums all elements in the stream.
 */
const streamSum = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'stream-sum-INPUT', data: { type: NodeType.Input } })
    .addNode({ id: 'stream-sum-AGGREGATOR', data: { type: 'dxn:test:sum-aggregator' } })
    .addNode({ id: 'stream-sum-OUTPUT', data: { type: NodeType.Output } })
    .addEdge(
      createEdge({ source: 'stream-sum-INPUT', output: 'stream', target: 'stream-sum-AGGREGATOR', input: 'stream' }),
    )
    .addEdge(
      createEdge({ source: 'stream-sum-AGGREGATOR', output: 'result', target: 'stream-sum-OUTPUT', input: 'result' }),
    );
};
