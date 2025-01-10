import { GraphModel, type GraphEdge, type GraphNode } from '@dxos/graph';
import { Chunk, Console, Effect, Option, Stream } from 'effect';
import { describe, test } from 'vitest';
import { NodeType, type ComputeEdge, type ComputeGraph, type ComputeNode } from '../schema';
import { createEdge, TestRuntime } from '../testing';
import { testServices } from '../testing/test-services';
import type { ResultStreamEvent } from '@dxos/assistant';
import { MockGpt } from '../services/gpt/mock';

const ENABLE_LOGGING = false;

describe('Gpt pipelines', () => {
  test('text output', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:gpt1', gpt1());

    const { text } = await Effect.runPromise(
      runtime
        .runGraph('dxn:graph:gpt1', {
          prompt: 'What is the meaning of life?',
        })
        .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING }))),
    );

    expect(await Effect.runPromise(text)).toEqual('This is a mock response that simulates a GPT-like output.');
  });

  test.only('stream output', async ({ expect }) => {
    const runtime = new TestRuntime();
    runtime.registerGraph('dxn:graph:gpt2', gpt2());

    const { tokenStream, text } = (await Effect.runPromise(
      runtime
        .runGraph('dxn:graph:gpt2', {
          prompt: 'What is the meaning of life?',
        })
        .pipe(Effect.provide(testServices({ enableLogging: ENABLE_LOGGING, gpt: new MockGpt({ maxDelay: 50 }) }))),
    )) as { tokenStream: Stream.Stream<ResultStreamEvent>; text: Effect.Effect<string> };

    console.log({ text });
    const p = Effect.runPromise(text).then((x) => {
      console.log({ x });
    });

    const tokens = await Effect.runPromise(
      tokenStream.pipe(
        Stream.filterMap((ev) =>
          ev.type === 'content_block_delta' && ev.delta.type === 'text_delta'
            ? Option.some(ev.delta.text)
            : Option.none(),
        ),
        Stream.tap((token) => Console.log(token)),
        Stream.runCollect,
        Effect.map(Chunk.toArray),
      ),
    );

    expect(tokens).toEqual([
      'This',
      ' ',
      'is',
      ' ',
      'a',
      ' ',
      'mock',
      ' ',
      'response',
      ' ',
      'that',
      ' ',
      'simulates',
      ' ',
      'a',
      ' ',
      'GPT-like',
      ' ',
      'output',
      '.',
      '',
    ]);

    await p;
  });
});

const gpt1 = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'gpt1-INPUT', data: { type: NodeType.Input } })
    .addNode({ id: 'gpt1-GPT', data: { type: NodeType.Gpt } })
    .addNode({ id: 'gpt1-OUTPUT', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'gpt1-INPUT', output: 'prompt', target: 'gpt1-GPT', input: 'prompt' }))
    .addEdge(createEdge({ source: 'gpt1-GPT', output: 'text', target: 'gpt1-OUTPUT', input: 'text' }));
};

const gpt2 = (): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>()
    .addNode({ id: 'gpt2-INPUT', data: { type: NodeType.Input } })
    .addNode({ id: 'gpt2-GPT', data: { type: NodeType.Gpt } })
    .addNode({ id: 'gpt2-OUTPUT', data: { type: NodeType.Output } })
    .addEdge(createEdge({ source: 'gpt2-INPUT', output: 'prompt', target: 'gpt2-GPT', input: 'prompt' }))
    .addEdge(createEdge({ source: 'gpt2-GPT', output: 'text', target: 'gpt2-OUTPUT', input: 'text' }))
    .addEdge(createEdge({ source: 'gpt2-GPT', output: 'tokenStream', target: 'gpt2-OUTPUT', input: 'tokenStream' }));
};
