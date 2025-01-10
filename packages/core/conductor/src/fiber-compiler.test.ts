//
// Copyright 2025 DXOS.org
//

import { Effect, type Context } from 'effect';
import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';
import { createEdgeId, GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';

import { EventLogger, logCustomEvent, type ComputeEvent } from './services/event-logger';
import { defineComputeNode, NodeType, type ComputeEdge, type ComputeGraph, type ComputeNode } from './schema';
import { consoleLogger, createEdge, noopLogger, TestRuntime } from './testing';
import { testServices } from './testing/test-services';

const ENABLE_LOGGING = false;

describe('Graph as a fiber runtime', () => {
  test('simple adder node', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerNode('dxn:test:add', addNode);
    runtime.registerGraph('dxn:graph:adder', adder());

    // const { input, output } = await runtime.compileGraph(adder());
    // console.log('input', input.toString());
    // console.log('output', output.toString());

    const result = await Effect.runPromise(
      runtime
        .runGraph('dxn:graph:adder', { number1: 1, number2: 2 })
        .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Effect.scoped),
    );
    expect(result).toEqual({ sum: 3 });
  });

  test('composition', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerNode('dxn:test:add', addNode);
    runtime.registerGraph('dxn:graph:adder', adder());
    runtime.registerGraph('dxn:graph:add3', add3());

    try {
      const result = await Effect.runPromise(
        runtime
          .runGraph('dxn:graph:add3', { a: 1, b: 2, c: 3 })
          .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING })), Effect.scoped),
      );
      expect(result).toEqual({ result: 6 });
    } catch (err) {
      log.catch(err);
    }
  });
});

/**
 * dxn:graph:adder
 * number1, number2 -> sum
 */
const adder = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'adder-X', data: { type: NodeType.Input } })
    .addNode({ id: 'adder-Y', data: { type: 'dxn:test:add' } })
    .addNode({ id: 'adder-Z', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'adder-X', output: 'number1', target: 'adder-Y', input: 'a' }))
    .addEdge(createEdge({ source: 'adder-X', output: 'number2', target: 'adder-Y', input: 'b' }))
    .addEdge(createEdge({ source: 'adder-Y', output: 'result', target: 'adder-Z', input: 'sum' }));
};

/**
 * dxn:graph:add3
 * a, b, c -> result
 * Uses adder node.
 */
const add3 = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'add3-X', data: { type: NodeType.Input } })
    .addNode({ id: 'add3-Y', data: { type: 'dxn:graph:adder' } })
    .addNode({ id: 'add3-Z1', data: { type: 'dxn:graph:adder' } })
    .addNode({ id: 'add3-Z2', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'add3-X', output: 'a', target: 'add3-Y', input: 'number1' }))
    .addEdge(createEdge({ source: 'add3-X', output: 'b', target: 'add3-Y', input: 'number2' }))
    .addEdge(createEdge({ source: 'add3-X', output: 'c', target: 'add3-Z1', input: 'number1' }))
    .addEdge(createEdge({ source: 'add3-Y', output: 'sum', target: 'add3-Z1', input: 'number2' }))
    .addEdge(createEdge({ source: 'add3-Z1', output: 'sum', target: 'add3-Z2', input: 'result' }));
};

const addNode = defineComputeNode({
  input: S.Struct({ a: S.Number, b: S.Number }),
  output: S.Struct({ result: S.Number }),
  compute: ({ a, b }) =>
    Effect.gen(function* () {
      yield* logCustomEvent({
        operation: 'add',
        operands: { a, b },
      });
      return { result: a + b };
    }),
});
