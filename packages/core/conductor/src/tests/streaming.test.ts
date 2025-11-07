//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { createTestServices } from '@dxos/functions-runtime/testing';

import { NODE_INPUT, NODE_OUTPUT } from '../nodes';
import { TestRuntime } from '../testing';
import { ComputeGraphModel, ValueBag, defineComputeNode, synchronizedComputeFunction } from '../types';
import { StreamSchema } from '../util';

const ENABLE_LOGGING = false;

describe('Streaming pipelines', () => {
  test('synchronous stream sum pipeline', async ({ expect }) => {
    const runtime = new TestRuntime(createTestServices({ logging: { enabled: ENABLE_LOGGING } }));
    runtime.registerNode('dxn:test:sum-aggregator', sumAggregator);
    runtime.registerGraph('dxn:compute:stream-sum', streamSum());

    const { result } = await Effect.runPromise(
      runtime
        .runGraph('dxn:compute:stream-sum', ValueBag.make({ stream: Effect.succeed(Stream.range(1, 10)) }))
        .pipe(Effect.flatMap(ValueBag.unwrap), Effect.scoped),
    );

    expect(result).toEqual(55);
  });

  test('asynchronous stream sum pipeline', async ({ expect }) => {
    const runtime = new TestRuntime(createTestServices({ logging: { enabled: ENABLE_LOGGING } }));
    runtime.registerNode('dxn:test:sum-aggregator', sumAggregator);
    runtime.registerGraph('dxn:compute:stream-sum', streamSum());

    const delayedStream = Stream.range(1, 10).pipe(
      Stream.mapEffect((n) => Effect.succeed(n).pipe(Effect.delay('50 millis'))),
    );

    const { result } = await Effect.runPromise(
      runtime
        .runGraph('dxn:compute:stream-sum', ValueBag.make({ stream: Effect.succeed(delayedStream) }))
        .pipe(Effect.flatMap(ValueBag.unwrap), Effect.scoped),
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
  input: Schema.Struct({ stream: StreamSchema(Schema.Number) }),
  output: Schema.Struct({ result: Schema.Number }),
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
const streamSum = () => {
  const model = ComputeGraphModel.create();
  model.builder
    .createNode({ id: 'stream-sum-INPUT', type: NODE_INPUT })
    .createNode({ id: 'stream-sum-AGGREGATOR', type: 'dxn:test:sum-aggregator' })
    .createNode({ id: 'stream-sum-OUTPUT', type: NODE_OUTPUT })
    .createEdge({ node: 'stream-sum-INPUT', property: 'stream' }, { node: 'stream-sum-AGGREGATOR', property: 'stream' })
    .createEdge(
      { node: 'stream-sum-AGGREGATOR', property: 'result' },
      { node: 'stream-sum-OUTPUT', property: 'result' },
    );

  return model;
};
